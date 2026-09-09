import Foundation
import Security
import GlfansCore

struct CommunityServiceError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}
struct CommunitySession: Codable {
    let access_token: String
    let refresh_token: String
    let expires_at: Double?
}

@MainActor final class CommunityStore: ObservableObject {
    @Published var quotes: [Quote] = []
    @Published var quotesLoaded = false
    @Published var stats: [String: CommunityStats] = [:]
    @Published var reactions: Set<String> = []
    @Published var busy: Set<String> = []
    @Published var loading = false
    @Published var message: String?
    private var session: CommunitySession?
    private var sessionTask: Task<CommunitySession, Error>?
    private var loadedAt: Date?
    private let host = Bundle.main.object(forInfoDictionaryKey: "GLFansSupabaseHost") as? String ?? ""
    private let key = Bundle.main.object(forInfoDictionaryKey: "GLFansSupabaseKey") as? String ?? ""
    var configured: Bool { !host.isEmpty && !host.contains("$(") && !key.isEmpty && !key.contains("$(") }
    init() {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "glfans.community", kSecAttrAccount as String: "session", kSecReturnData as String: true]
        var item: CFTypeRef?
        if SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess, let data = item as? Data { session = try? JSONDecoder().decode(CommunitySession.self, from: data) }
        if let data = try? Data(contentsOf: Self.quotesCache), let saved = try? JSONDecoder().decode([Quote].self, from: data) { quotes = saved; quotesLoaded = true }
    }
    private func persist(_ value: CommunitySession) {
        session = value
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "glfans.community", kSecAttrAccount as String: "session"]
        SecItemDelete(query as CFDictionary)
        var attributes = query
        attributes[kSecValueData as String] = try? JSONEncoder().encode(value)
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(attributes as CFDictionary, nil)
    }
    private func request(_ path: String, body: [String: String]? = nil, token: String? = nil) async throws -> Data {
        guard configured, let url = URL(string: "https://" + host + path) else { throw CommunityServiceError(message: "互动服务尚未配置") }
        var request = URLRequest(url: url); request.timeoutInterval = 20
        request.setValue(key, forHTTPHeaderField: "apikey")
        if let token { request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization") }
        else if key.hasPrefix("eyJ") { request.setValue("Bearer " + key, forHTTPHeaderField: "Authorization") }
        if let body { request.httpMethod = "POST"; request.httpBody = try JSONSerialization.data(withJSONObject: body); request.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let response = response as? HTTPURLResponse, (200..<300).contains(response.statusCode) else {
            throw CommunityServiceError(message: CommunityValidation.message(String(data: data, encoding: .utf8) ?? ""))
        }
        return data
    }
    private func authenticated() async throws -> CommunitySession {
        if let session, (session.expires_at ?? 0) > Date().timeIntervalSince1970 + 60 { return session }
        if let sessionTask { return try await sessionTask.value }
        let previous = session
        let task = Task<CommunitySession, Error> {
            let data = try await request(previous == nil ? "/auth/v1/signup" : "/auth/v1/token?grant_type=refresh_token", body: previous.map { ["refresh_token": $0.refresh_token] } ?? [:])
            return try JSONDecoder().decode(CommunitySession.self, from: data)
        }
        sessionTask = task
        defer { sessionTask = nil }
        let value = try await task.value; persist(value); return value
    }
    func load(force: Bool = false) async {
        guard !loading else { return }
        if !force, let loadedAt, Date().timeIntervalSince(loadedAt) < 300 { return }
        guard configured else { message = "互动服务尚未配置"; return }
        loading = true; defer { loading = false }
        async let statsError = loadStats()
        async let quotesError = loadQuotes()
        async let reactionsError = loadReactions()
        let errors = await [statsError, quotesError, reactionsError].compactMap { $0 }
        message = errors.first
        if errors.isEmpty { loadedAt = Date() }
    }
    private static var quotesCache: URL { FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("glfans-quotes.json") }
    private func loadStats() async -> String? {
        do {
            let data = try await request("/rest/v1/rpc/get_community_stats", body: [:])
            let rows = try JSONDecoder().decode([CommunityStats].self, from: data)
            stats = Dictionary(uniqueKeysWithValues: rows.map { ($0.key, $0) }); return nil
        } catch { return error.localizedDescription }
    }
    private func loadQuotes() async -> String? {
        do {
            let data = try await request("/rest/v1/community_quotes?select=id,text,speaker,cover_path,sort_order,is_pinned,created_at&status=eq.published&order=sort_order.asc,created_at.asc")
            quotes = try JSONDecoder().decode([Quote].self, from: data); quotesLoaded = true
            try? FileManager.default.createDirectory(at: Self.quotesCache.deletingLastPathComponent(), withIntermediateDirectories: true)
            try? data.write(to: Self.quotesCache, options: .atomic); return nil
        } catch { return error.localizedDescription }
    }
    private func loadReactions() async -> String? {
        guard session != nil else { return nil }
        do {
            let token = try await authenticated().access_token
            let data = try await request("/rest/v1/rpc/get_my_community_reactions", body: [:], token: token)
            reactions = Set(try JSONDecoder().decode([ReactionTarget].self, from: data).map(\.key)); return nil
        } catch { return error.localizedDescription }
    }
    func comments(type: String, id: String, offset: Int = 0) async throws -> [CommunityComment] {
        let allowed = CharacterSet.urlQueryAllowed.subtracting(CharacterSet(charactersIn: "&+=?#"))
        let escaped = id.addingPercentEncoding(withAllowedCharacters: allowed) ?? ""
        let data = try await request("/rest/v1/community_comments?select=id,target_type,target_id,nickname,body,created_at&target_type=eq.\(type)&target_id=eq.\(escaped)&status=eq.published&order=created_at.desc&limit=30&offset=\(offset)")
        return try JSONDecoder().decode([CommunityComment].self, from: data)
    }
    func react(type: String, id: String) async {
        let target = type + ":" + id
        guard !busy.contains(target) else { return }; busy.insert(target); defer { busy.remove(target) }
        do {
            let token = try await authenticated().access_token
            let data = try await request("/rest/v1/rpc/toggle_community_reaction", body: ["p_target_type": type, "p_target_id": id], token: token)
            let row = try JSONDecoder().decode([ReactionResult].self, from: data).first
            if let row {
                if row.liked { reactions.insert(target) } else { reactions.remove(target) }
                if stats[target] != nil { stats[target]?.reaction_count = row.reaction_count }
                else { await load(force: true) }
            }
            message = nil
        } catch { message = error.localizedDescription }
    }
    func submit(type: String, id: String, nickname: String, body: String) async throws {
        guard CommunityValidation.valid(body, range: 2...400), CommunityValidation.valid(nickname, range: 0...24) else { throw CommunityServiceError(message: "评论需要 2—400 个字，昵称不超过 24 个字。") }
        let token = try await authenticated().access_token
        _ = try await request("/rest/v1/rpc/submit_community_comment", body: ["p_target_type": type, "p_target_id": id, "p_nickname": nickname.trimmingCharacters(in: .whitespacesAndNewlines), "p_body": body.trimmingCharacters(in: .whitespacesAndNewlines)], token: token)
        await load(force: true)
    }
    func publish(text: String, speaker: String) async throws {
        guard CommunityValidation.valid(text, range: 2...120), CommunityValidation.valid(speaker, range: 0...24) else { throw CommunityServiceError(message: "原话需要 2—120 个字，署名不超过 24 个字。") }
        let token = try await authenticated().access_token
        _ = try await request("/rest/v1/rpc/submit_community_quote", body: ["p_text": text.trimmingCharacters(in: .whitespacesAndNewlines), "p_speaker": speaker.trimmingCharacters(in: .whitespacesAndNewlines)], token: token)
        await load(force: true)
    }
}
