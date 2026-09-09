import SwiftUI
import Charts
import GlfansCore

struct CommentTarget: Identifiable { let type: String; let id: String; let title: String }

struct LiteratureView: View {
    @EnvironmentObject var app: AppModel
    @EnvironmentObject var community: CommunityStore
    let catalog: Catalog
    @State private var target: CommentTarget?
    @State private var publishing = false
    @State private var sort = "默认"
    @AppStorage("glfans.quoteOrder") private var order = ""
    @AppStorage("glfans.hiddenQuotes") private var hidden = ""
    private let frequencies: [(String, Int)] = [("我懂",118),("救命",122),("真的",128),("感动",115),("支持",110),("想你",84),("朋友",73),("CP",52),("喜欢",44)]
    var quotes: [Quote] {
        let all = community.quotesLoaded ? community.quotes : catalog.quotes
        let positions = order.components(separatedBy: "|")
        let hiddenIDs = Set(hidden.components(separatedBy: "|"))
        return all.filter { !hiddenIDs.contains($0.id) }.sorted { a, b in
            if (a.is_pinned ?? false) != (b.is_pinned ?? false) { return a.is_pinned == true }
            let aStats = community.stats["quote:" + a.id], bStats = community.stats["quote:" + b.id]
            if sort == "心动最多", (aStats?.reaction_count ?? 0) != (bStats?.reaction_count ?? 0) { return (aStats?.reaction_count ?? 0) > (bStats?.reaction_count ?? 0) }
            if sort == "评论最多", (aStats?.comment_count ?? 0) != (bStats?.comment_count ?? 0) { return (aStats?.comment_count ?? 0) > (bStats?.comment_count ?? 0) }
            if sort == "最新", a.created_at != b.created_at { return (a.created_at ?? "") > (b.created_at ?? "") }
            if positions.contains(a.id) || positions.contains(b.id) { return (positions.firstIndex(of: a.id) ?? 999) < (positions.firstIndex(of: b.id) ?? 999) }
            return (all.firstIndex(where: { $0.id == a.id }) ?? 0) < (all.firstIndex(where: { $0.id == b.id }) ?? 0)
        }
    }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                PaperHeading(title: "坑底文学", subtitle: "VOICES FROM THE PIT")
                Chart(Array(frequencies.enumerated()), id: \.offset) { index, item in
                    AreaMark(x: .value("词语", index), y: .value("频次", item.1)).foregroundStyle(LinearGradient(colors: [Pit.pink.opacity(0.45), Pit.pink.opacity(0.03)], startPoint: .top, endPoint: .bottom)).interpolationMethod(.catmullRom)
                    LineMark(x: .value("词语", index), y: .value("频次", item.1)).foregroundStyle(Pit.pink).interpolationMethod(.catmullRom)
                    PointMark(x: .value("词语", index), y: .value("频次", item.1)).foregroundStyle(Pit.ink)
                }.chartXAxis { AxisMarks(values: [0,2,4,6,8]) { axis in AxisValueLabel { if let i = axis.as(Int.self) { Text(app.t(frequencies[i].0)).font(.caption2) } } } }.chartYAxis(.hidden).frame(height: 160).accessibilityLabel(app.t("坑底词频"))
                Text(app.t("这里可以投稿，也可以在别人的卡片下接着聊。")).font(.subheadline).foregroundStyle(.secondary)
                CommunityActions(type: "page", id: "tide-words") { target = CommentTarget(type: "page", id: "tide-words", title: "坑底文学") }
                HStack {
                    Menu { ForEach(["默认", "最新", "心动最多", "评论最多"], id: \.self) { option in Button(app.t(option)) { sort = option } } } label: { Label(app.t(sort), systemImage: "arrow.up.arrow.down").frame(minHeight: 44) }
                    Spacer()
                    Button { publishing = true } label: { Label(app.t("写一句"), systemImage: "square.and.pencil").frame(minHeight: 44) }
                }.font(.subheadline.bold())
                if let message = community.message { HStack { Text(app.t(message)).font(.caption); Spacer(); Button(app.t("重试")) { Task { await community.load(force: true) } } }.foregroundStyle(.secondary) }
                ForEach(quotes) { quote in
                    VStack(alignment: .leading, spacing: 16) {
                        HStack { Image(systemName: "quote.opening").font(.title2).foregroundStyle(Pit.pink); Spacer(); if quote.is_pinned == true { Label(app.t("置顶"), systemImage: "pin.fill").font(.caption) } }
                        Text(app.t(quote.text)).font(.system(.title3, design: .rounded).weight(.bold)).lineSpacing(5).textSelection(.enabled)
                        Text(quote.speaker == "匿名坑底人" ? app.t(quote.speaker) : quote.speaker).font(.caption).foregroundStyle(.secondary)
                        CommunityActions(type: "quote", id: quote.id) { target = CommentTarget(type: "quote", id: quote.id, title: quote.text) }
                    }.padding(22).frame(maxWidth: .infinity, alignment: .leading).background(.white)
                        .overlay(alignment: .topLeading) { Rectangle().fill(Pit.pink).frame(width: 30, height: 5) }
                        .contextMenu {
                            ShareLink(item: quote.text)
                            Button(app.t("隐藏这条内容"), role: .destructive) { hidden += "|" + quote.id }
                        }
                        .draggable(quote.id)
                        .dropDestination(for: String.self) { ids, _ in
                            guard sort == "默认", let source = ids.first, source != quote.id, quotes.contains(where: { $0.id == source }) else { return false }
                            var list = quotes.map(\.id); list.removeAll { $0 == source }; list.insert(source, at: list.firstIndex(of: quote.id) ?? 0); order = list.joined(separator: "|"); return true
                        }
                }
            }.padding(20)
        }.background(Pit.paper).navigationBarTitleDisplayMode(.inline)
        .task { await community.load() }.refreshable { await community.load(force: true) }
        .sheet(item: $target) { value in CommentsSheet(target: value) }
        .sheet(isPresented: $publishing) { PublishQuoteSheet() }
    }
}

struct CommunityActions: View {
    @EnvironmentObject var app: AppModel
    @EnvironmentObject var community: CommunityStore
    let type: String
    let id: String
    let comments: () -> Void
    var key: String { type + ":" + id }
    var body: some View {
        HStack(spacing: 20) {
            Button { Task { await community.react(type: type, id: id) } } label: {
                HStack(spacing: 6) { Image(systemName: community.reactions.contains(key) ? "heart.fill" : "heart"); Text(community.stats[key].map { String($0.reaction_count) } ?? "—").monospacedDigit() }.frame(minWidth: 60, minHeight: 44)
            }.disabled(community.busy.contains(key)).accessibilityLabel(app.t(community.reactions.contains(key) ? "取消心动" : "送出心动"))
            Button(action: comments) { HStack(spacing: 6) { Image(systemName: "bubble"); Text(community.stats[key].map { String($0.comment_count) } ?? "—").monospacedDigit() }.frame(minWidth: 60, minHeight: 44) }.accessibilityLabel(app.t("评论"))
            Spacer()
            if let stats = community.stats[key] { Label(String(stats.unique_visitor_count), systemImage: "eye").font(.caption).foregroundStyle(.secondary) }
        }.font(.subheadline).foregroundStyle(Pit.ink)
    }
}

struct CommentsSheet: View {
    @EnvironmentObject var app: AppModel
    @EnvironmentObject var community: CommunityStore
    @Environment(\.dismiss) var dismiss
    let target: CommentTarget
    @State private var comments: [CommunityComment] = []
    @State private var writing = false
    @State private var loading = true
    @State private var sending = false
    @State private var hasMore = false
    @State private var bodyText = ""
    @AppStorage("glfans.nickname") private var nickname = ""
    @State private var error: String?
    var draftKey: String { "glfans.commentDraft." + target.type + "." + target.id }
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text(app.t(target.title)).font(.headline).lineSpacing(4)
                    if loading { ProgressView().frame(maxWidth: .infinity) }
                    if let error { Text(app.t(error)).font(.caption).foregroundStyle(.red); Button(app.t("重试")) { Task { await load() } } }
                    if writing {
                        TextField(app.t("昵称"), text: $nickname).textFieldStyle(.roundedBorder)
                        TextEditor(text: $bodyText).frame(minHeight: 110).scrollContentBackground(.hidden).padding(8).background(.white).accessibilityLabel(app.t("评论内容"))
                        Text("\(bodyText.unicodeScalars.count) / 400").font(.caption).foregroundStyle(.secondary)
                    } else {
                        ForEach(comments) { comment in
                            VStack(alignment: .leading, spacing: 8) {
                                Text(comment.nickname == "匿名坑底人" ? app.t(comment.nickname) : comment.nickname).font(.caption.bold())
                                Text(app.t(comment.body)).font(.body).lineSpacing(4).textSelection(.enabled)
                                Text(comment.created_at.prefix(10)).font(.caption2).foregroundStyle(.secondary)
                            }.padding(16).frame(maxWidth: .infinity, alignment: .leading).background(.white)
                        }
                        if hasMore { Button(app.t("加载更多")) { Task { await load(more: true) } }.frame(minHeight: 44) }
                    }
                }.padding(20)
            }.background(Pit.paper)
            .safeAreaInset(edge: .bottom) {
                Button { if writing { Task { await send() } } else { writing = true } } label: { Text(app.t(sending ? "发送中…" : writing ? "发布评论" : "写评论")).frame(maxWidth: .infinity).pitButton() }
                    .disabled(sending || loading || (writing && !CommunityValidation.valid(bodyText, range: 2...400))).padding(16).background(Pit.paper)
            }
            .navigationTitle(app.t("评论")).navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button(app.t("完成")) { dismiss() } }
                if writing && !comments.isEmpty { ToolbarItem(placement: .cancellationAction) { Button(app.t("返回评论")) { writing = false } } }
            }
            .task { bodyText = UserDefaults.standard.string(forKey: draftKey) ?? ""; if community.stats[target.type + ":" + target.id]?.comment_count == 0 { writing = true; loading = false } else { await load() } }
            .onChange(of: bodyText) { _, value in UserDefaults.standard.set(value, forKey: draftKey) }
        }.presentationDetents([.large]).presentationDragIndicator(.visible)
    }
    func load(more: Bool = false) async {
        loading = true; defer { loading = false }
        do {
            let rows = try await community.comments(type: target.type, id: target.id, offset: more ? comments.count : 0)
            if more { comments += rows } else { comments = rows }
            hasMore = rows.count == 30; writing = comments.isEmpty; error = nil
        } catch { self.error = error.localizedDescription }
    }
    func send() async {
        sending = true; defer { sending = false }
        do { try await community.submit(type: target.type, id: target.id, nickname: nickname, body: bodyText); bodyText = ""; await load() }
        catch { self.error = error.localizedDescription }
    }
}

struct PublishQuoteSheet: View {
    @EnvironmentObject var app: AppModel
    @EnvironmentObject var community: CommunityStore
    @Environment(\.dismiss) var dismiss
    @AppStorage("glfans.quoteDraft") private var text = ""
    @AppStorage("glfans.nickname") private var speaker = ""
    @State private var sending = false
    @State private var error: String?
    var body: some View {
        NavigationStack {
            Form {
                TextField(app.t("署名"), text: $speaker)
                TextEditor(text: $text).frame(minHeight: 140)
                Text("\(text.unicodeScalars.count) / 120").font(.caption)
                if let error { Text(app.t(error)).foregroundStyle(.red) }
                Button(app.t(sending ? "发送中…" : "发布")) {
                    sending = true
                    Task {
                        do { try await community.publish(text: text, speaker: speaker); text = ""; dismiss() }
                        catch { self.error = error.localizedDescription }
                        sending = false
                    }
                }.disabled(sending || !CommunityValidation.valid(text, range: 2...120))
            }.navigationTitle(app.t("写一句")).toolbar { ToolbarItem(placement: .cancellationAction) { Button(app.t("取消")) { dismiss() } } }
        }
    }
}
