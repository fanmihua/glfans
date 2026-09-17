import Foundation
import Security
import GlfansCore

struct CommunityServiceError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}
private struct NativeCommunitySession: Codable {
    let cookie: String
    let csrfToken: String
}
private struct APIEnvelope<Value: Decodable>: Decodable { let data: Value }
private struct APIErrorEnvelope: Decodable { struct Detail: Decodable { let code: String; let message: String }; let error: Detail }
private struct Bootstrap: Decodable { let csrfToken: String }
private struct ServerStats: Decodable {
    let comments: Int; let likes: Int; let uniqueVisitors: Int; let views: Int
}
private final class CommunityHTTPSDelegate: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    func urlSession(_ session:URLSession,task:URLSessionTask,willPerformHTTPRedirection response:HTTPURLResponse,newRequest request:URLRequest,completionHandler:@escaping (URLRequest?)->Void) {
        // Session credentials must never follow a redirect to another service.
        completionHandler(nil)
    }
}

@MainActor final class CommunityStore: ObservableObject {
    @Published var quotes: [Quote] = []
    @Published var quotesLoaded = false
    @Published var stats: [String: CommunityStats] = [:]
    @Published var reactions: Set<String> = []
    @Published var busy: Set<String> = []
    @Published var loading = false
    @Published var statsLoaded = false
    @Published var message: String?
    @Published private(set) var safetyAvailable = false
    @Published private(set) var blocks: [CommunityBlock] = []
    @Published private(set) var deletingAccount = false
    @Published private(set) var hasIdentity = false
    private var statsConfirmedAt: Date?
    var statsAreFresh: Bool { statsConfirmedAt.map { Date().timeIntervalSince($0) < 30 } ?? false }
    private var loadedAt: Date?
    private var session: NativeCommunitySession?
    private var sessionTask: Task<NativeCommunitySession, Error>?
    private var identityGeneration = 0
    private let host = Bundle.main.object(forInfoDictionaryKey:"GLFansAPIHost") as? String ?? "glfans.com"
    private let keychainService = "glfans.community.selfhost"
    private let network: URLSession = {
        let config=URLSessionConfiguration.ephemeral
        config.httpShouldSetCookies=false;config.httpCookieStorage=nil;config.urlCache=nil
        return URLSession(configuration:config,delegate:CommunityHTTPSDelegate(),delegateQueue:nil)
    }()
    private var deletionPending: Bool { UserDefaults.standard.bool(forKey:"glfans.selfhostDeletionPending") }
    var configured: Bool { !host.isEmpty && !host.contains("$(") && !host.contains("/") }
    func isBlocked(_ key:String?) -> Bool {key.map {value in blocks.contains {$0.author_key == value}} ?? false}
    private var keychainQuery: [String:Any] {
        [kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:keychainService,kSecAttrAccount as String:host]
    }
    init() {
        var query=keychainQuery;query[kSecReturnData as String]=true
        var item:CFTypeRef?
        if SecItemCopyMatching(query as CFDictionary,&item)==errSecSuccess,let data=item as? Data {session=try? JSONDecoder().decode(NativeCommunitySession.self,from:data)}
        hasIdentity=session != nil
        if let data=UserDefaults.standard.data(forKey:"glfans.communityBlocks"),let saved=try? JSONDecoder().decode([CommunityBlock].self,from:data) {blocks=saved}
        if let data=try? Data(contentsOf:Self.quotesCache),let saved=try? JSONDecoder().decode([Quote].self,from:data) {quotes=saved;quotesLoaded=true}
    }
    private func persist(_ value:NativeCommunitySession) throws {
        let data=try JSONEncoder().encode(value)
        let update=SecItemUpdate(keychainQuery as CFDictionary,[kSecValueData as String:data] as CFDictionary)
        if update==errSecItemNotFound {
            var query=keychainQuery;query[kSecValueData as String]=data;query[kSecAttrAccessible as String]=kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            guard SecItemAdd(query as CFDictionary,nil)==errSecSuccess else {throw CommunityServiceError(message:"社区身份保存失败，请重试。")}
        } else if update != errSecSuccess {throw CommunityServiceError(message:"社区身份保存失败，请重试。")}
        session=value;hasIdentity=true
    }
    private func transport(_ path:String,body:[String:String]?=nil,method:String?=nil) async throws -> (Data,HTTPURLResponse) {
        let generation=identityGeneration
        guard !deletingAccount || path=="/api/community/account" else {throw CommunityServiceError(message:"账号正在删除，请稍候。")}
        guard configured,let url=URL(string:"https://"+host+path) else {throw CommunityServiceError(message:"互动服务尚未配置")}
        var request=URLRequest(url:url);request.timeoutInterval=20
        request.httpMethod=method ?? (body == nil ? "GET":"POST")
        request.setValue("application/json",forHTTPHeaderField:"Accept")
        if let session {request.setValue(session.cookie,forHTTPHeaderField:"Cookie");request.setValue(session.csrfToken,forHTTPHeaderField:"X-CSRF-Token")}
        if request.httpMethod != "GET" {
            request.setValue("https://"+host,forHTTPHeaderField:"Origin")
            request.setValue("application/json",forHTTPHeaderField:"Content-Type")
            request.httpBody=try JSONSerialization.data(withJSONObject:body ?? [:])
        }
        let (data,response)=try await network.data(for:request)
        guard generation==identityGeneration else {throw CancellationError()}
        guard let http=response as? HTTPURLResponse else {throw URLError(.badServerResponse)}
        guard (200..<300).contains(http.statusCode) else {
            let server=try? JSONDecoder().decode(APIErrorEnvelope.self,from:data)
            throw CommunityServiceError(message:server?.error.message ?? "互动服务暂时没有回应，请稍后重试。")
        }
        return (data,http)
    }
    private func request<T:Decodable>(_ path:String,body:[String:String]?=nil,method:String?=nil) async throws -> T {
        let (data,_)=try await transport(path,body:body,method:method)
        return try JSONDecoder().decode(APIEnvelope<T>.self,from:data).data
    }
    private func authenticated() async throws -> NativeCommunitySession {
        guard !deletingAccount && !deletionPending else {throw CommunityServiceError(message:"账号删除尚未确认，请在隐私与数据中重试。")}
        if let session {return session}
        if let sessionTask {return try await sessionTask.value}
        let task=Task<NativeCommunitySession,Error> {
            let (data,http)=try await transport("/api/session",body:[:])
            let result=try JSONDecoder().decode(APIEnvelope<Bootstrap>.self,from:data).data
            guard let raw=http.value(forHTTPHeaderField:"Set-Cookie"),let cookie=raw.split(separator:";").first,cookie.hasPrefix("glfans_session=") else {throw URLError(.badServerResponse)}
            return NativeCommunitySession(cookie:String(cookie),csrfToken:result.csrfToken)
        }
        sessionTask=task;defer {sessionTask=nil}
        let value=try await task.value
        guard !deletingAccount else {throw CancellationError()}
        try persist(value);return value
    }
    func load(force:Bool=false) async {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--source-state") {quotesLoaded=false;statsLoaded=false;return}
        #endif
        guard !loading, configured else {return}
        if !force,let loadedAt,Date().timeIntervalSince(loadedAt)<300 {return}
        loading=true;defer {loading=false}
        // Public content never waits for a new account or safety feature discovery.
        async let s=loadStats();async let q=loadQuotes();async let r=loadReactions()
        async let safety:Void=refreshSafety()
        let errors=await [s,q,r].compactMap {$0};await safety
        message=errors.first;if errors.isEmpty {loadedAt=Date()}
    }
    private static var quotesCache:URL {FileManager.default.urls(for:.applicationSupportDirectory,in:.userDomainMask)[0].appendingPathComponent("glfans-selfhost-quotes.json")}
    private func loadStats() async -> String? {
        do {
            let rows:[String:ServerStats]=try await request("/api/community/stats")
            stats=Dictionary(uniqueKeysWithValues:rows.compactMap {key,row in
                let parts=key.split(separator:":",maxSplits:1);guard parts.count==2 else {return nil}
                return (key,CommunityStats(type:String(parts[0]),id:String(parts[1]),comments:row.comments,reactions:row.likes,visitors:row.uniqueVisitors,views:row.views))
            });statsLoaded=true;statsConfirmedAt=Date();return nil
        } catch {return error.localizedDescription}
    }
    private func loadQuotes() async -> String? {
        do {
            let rows:[Quote]=try await request("/api/community/quotes")
            quotes=rows;quotesLoaded=true
            try? FileManager.default.createDirectory(at:Self.quotesCache.deletingLastPathComponent(),withIntermediateDirectories:true)
            try? JSONEncoder().encode(rows).write(to:Self.quotesCache,options:.atomic);return nil
        } catch {return error.localizedDescription}
    }
    private func loadReactions() async -> String? {
        guard session != nil else {return nil}
        do {let keys:[String]=try await request("/api/community/reactions");reactions=Set(keys);return nil} catch {return error.localizedDescription}
    }
    func comments(type:String,id:String,offset:Int=0) async throws -> [CommunityComment] {
        let allowed=CharacterSet.urlQueryAllowed.subtracting(CharacterSet(charactersIn:"&+=?#"))
        let escaped=id.addingPercentEncoding(withAllowedCharacters:allowed) ?? ""
        return try await request("/api/community/comments?targetType=\(type)&targetId=\(escaped)&limit=30&offset=\(offset)")
    }
    func recordView(type:String,id:String) async {
        #if targetEnvironment(simulator)
        return
        #else
        guard configured,session != nil,!deletionPending else {return}
        struct Result:Decodable {let view_count:Int}
        do {let _:Result=try await request("/api/community/views",body:["targetType":type,"targetId":id]);_ = await loadStats()} catch {}
        #endif
    }
    func react(type:String,id:String) async {
        let target=type+":"+id;guard !busy.contains(target) else {return}
        busy.insert(target);defer {busy.remove(target)}
        struct Result:Decodable {let liked:Bool;let likes:Int}
        do {
            _ = try await authenticated()
            let result:Result=try await request("/api/community/reactions/toggle",body:["targetType":type,"targetId":id])
            if result.liked {reactions.insert(target)} else {reactions.remove(target)}
            if stats[target] != nil {stats[target]?.reaction_count=result.likes} else {_ = await loadStats()}
            message=nil
        } catch {message=error.localizedDescription}
    }
    func submit(type:String,id:String,nickname:String,body:String) async throws {
        guard CommunityValidation.valid(body,range:2...400),CommunityValidation.valid(nickname,range:0...24) else {throw CommunityServiceError(message:"评论需要 2—400 个字，昵称不超过 24 个字。")}
        _ = try await authenticated()
        let _:CommunityComment=try await request("/api/community/comments",body:["targetType":type,"targetId":id,"nickname":nickname.trimmingCharacters(in:.whitespacesAndNewlines),"body":body.trimmingCharacters(in:.whitespacesAndNewlines)])
        await load(force:true)
    }
    func publish(text:String,speaker:String) async throws {
        guard CommunityValidation.valid(text,range:2...120),CommunityValidation.valid(speaker,range:0...24) else {throw CommunityServiceError(message:"原话需要 2—120 个字，署名不超过 24 个字。")}
        _ = try await authenticated()
        let _:Quote=try await request("/api/community/quotes",body:["text":text.trimmingCharacters(in:.whitespacesAndNewlines),"speaker":speaker.trimmingCharacters(in:.whitespacesAndNewlines)])
        await load(force:true)
    }
    func refreshSafety() async {
        struct Version:Decodable {let version:Int}
        do {
            let version:Version=try await request("/api/community/safety");safetyAvailable=version.version>=1
            if session != nil,!deletionPending {
                blocks=try await request("/api/community/blocks")
                UserDefaults.standard.set(try JSONEncoder().encode(blocks),forKey:"glfans.communityBlocks")
            }
        } catch {safetyAvailable=false}
    }
    private func requireSafety() async throws {
        if !safetyAvailable {await refreshSafety()}
        guard safetyAvailable else {throw CommunityServiceError(message:"社区安全服务暂不可用，请稍后重试或联系客服。")}
    }
    func report(type:String,id:String,reason:String,detail:String) async throws -> String {
        try await requireSafety();_ = try await authenticated()
        struct Result:Decodable {let id:String}
        let result:Result=try await request("/api/community/reports",body:["contentType":type,"contentId":id,"reason":reason,"detail":detail]);return result.id
    }
    func myReports() async throws -> [SafetyReport] {
        guard hasIdentity else {return []};try await requireSafety()
        return try await request("/api/community/reports")
    }
    func block(type:String,id:String) async throws {
        try await requireSafety();_ = try await authenticated()
        let block:CommunityBlock=try await request("/api/community/blocks",body:["contentType":type,"contentId":id])
        blocks.removeAll {$0.id==block.id};blocks.append(block)
        UserDefaults.standard.set(try JSONEncoder().encode(blocks),forKey:"glfans.communityBlocks")
        await load(force:true)
    }
    func unblock(_ key:String) async throws {
        try await requireSafety()
        struct Result:Decodable {let removed:Bool}
        let _:Result=try await request("/api/community/blocks/"+key,body:[:],method:"DELETE")
        blocks.removeAll {$0.id==key};UserDefaults.standard.set(try JSONEncoder().encode(blocks),forKey:"glfans.communityBlocks")
        await load(force:true)
    }
    func deleteAccount() async throws {
        guard !deletingAccount,session != nil else {return};try await requireSafety()
        deletingAccount=true;UserDefaults.standard.set(true,forKey:"glfans.selfhostDeletionPending")
        defer {deletingAccount=false}
        struct Result:Decodable {let deleted:Bool}
        let result:Result=try await request("/api/community/account",body:["confirmation":"DELETE"],method:"DELETE")
        guard result.deleted else {throw CommunityServiceError(message:"账号删除尚未确认，请在隐私与数据中重试。")}
        identityGeneration += 1;sessionTask?.cancel();sessionTask=nil;session=nil;hasIdentity=false
        SecItemDelete(keychainQuery as CFDictionary)
        for key in UserDefaults.standard.dictionaryRepresentation().keys where key.hasPrefix("glfans.commentDraft.") || ["glfans.nickname","glfans.quoteDraft","glfans.hiddenQuotes","glfans.selfhostDeletionPending","glfans.communityBlocks"].contains(key) {UserDefaults.standard.removeObject(forKey:key)}
        quotes=[];quotesLoaded=false;stats=[:];statsLoaded=false;reactions=[];blocks=[];loadedAt=nil;message=nil
        try? FileManager.default.removeItem(at:Self.quotesCache)
    }
}
