import SwiftUI
import GlfansCore

struct RepoView: View {
    @EnvironmentObject var app: AppModel
    let catalog: Catalog
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                PaperHeading(title: "REPO 文专栏", subtitle: "ROMANCE · EVIDENCE · ARCHIVE")
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 16), GridItem(.flexible())], spacing: 28) {
                    ForEach(Array(catalog.collections.enumerated()), id: \.element.id) { index, collection in
                        NavigationLink { CollectionView(collection: collection) } label: {
                            VStack(alignment: .leading, spacing: 10) {
                                LocalArtwork(source: collection.cover, mode: .fill).frame(height: 190).clipped().padding(7).background(.white).rotationEffect(.degrees(index % 2 == 0 ? -3 : 3))
                                Text(collection.title).font(.headline).foregroundStyle(Pit.ink).fixedSize(horizontal: false, vertical: true)
                                Text(String(format: "%02d", index + 1) + " / \(collection.visibleArticles.count) " + app.t("篇")).font(.caption.monospaced()).foregroundStyle(.secondary)
                            }
                        }.accessibilityIdentifier("collection-" + collection.slug)
                    }
                }
                Text(app.t("每一份心动，都有迹可循。")).font(.footnote).foregroundStyle(.secondary)
            }.padding(20)
        }.background(Pit.paper)
    }
}

struct CollectionView: View {
    @EnvironmentObject var app: AppModel
    let collection: RepoCollection
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                PaperHeading(title: collection.title, subtitle: collection.issue)
                LocalArtwork(source: collection.cover).frame(maxHeight: 360).padding(10).background(.white).rotationEffect(.degrees(-2))
                ArticleBody(xml: collection.summaryXml)
                PaperHeading(title: "这一坑的 Repo", subtitle: "READ THE EVIDENCE")
                ForEach(collection.visibleArticles) { article in
                    NavigationLink { ArticleView(collection: collection, article: article) } label: {
                        VStack(alignment: .leading, spacing: 16) {
                            Text(app.t(article.label)).font(.caption.bold())
                            Text(app.t(article.title)).font(.title3.bold()).foregroundStyle(Pit.ink).fixedSize(horizontal: false, vertical: true)
                            Image(systemName: "arrow.up.right").font(.title2).foregroundStyle(Pit.pink).frame(maxWidth: .infinity, alignment: .trailing)
                        }.padding(22).frame(maxWidth: .infinity, alignment: .leading).background(.white)
                    }.accessibilityIdentifier("article-" + article.slug)
                }
            }.padding(20)
        }.background(Pit.paper).navigationBarTitleDisplayMode(.inline)
    }
}

struct ArticleView: View {
    @EnvironmentObject var app: AppModel
    let collection: RepoCollection
    let article: RepoArticle
    var next: RepoArticle? { guard let index = collection.visibleArticles.firstIndex(where: { $0.id == article.id }), collection.visibleArticles.indices.contains(index + 1) else { return nil }; return collection.visibleArticles[index + 1] }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                Text(collection.title).font(.caption.bold())
                Text(app.t(article.title)).font(.system(.largeTitle, design: .rounded).weight(.black)).foregroundStyle(Pit.pink).fixedSize(horizontal: false, vertical: true)
                Rectangle().fill(Pit.pink).frame(width: 64, height: 4)
                ArticleBody(xml: article.xml, hideLeadHeading: true)
                if let next {
                    Divider().padding(.top, 20)
                    NavigationLink { ArticleView(collection: collection, article: next) } label: { VStack(alignment: .leading, spacing: 8) { Text(app.t("下一篇")).font(.caption); Text(app.t(next.title)).font(.headline); Image(systemName: "arrow.right") }.padding(.vertical, 20) }
                }
            }.padding(22)
        }.background(Pit.paper).navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .topBarTrailing) { ShareLink(item: URL(string: "https://fanmihua.github.io/glfans/#/column/\(collection.slug)/\(article.slug)")!) } }
    }
}

struct ArticleBody: View {
    @EnvironmentObject var app: AppModel
    let xml: String
    var hideLeadHeading = false
    @State private var picture: PictureSelection?
    var parsed: Result<[ArticleBlock], Error> { Result { try ArticleParser.parse(xml, hideLeadHeading: hideLeadHeading) } }
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            switch parsed {
            case .success(let blocks):
                ForEach(blocks) { block in
                    switch block.kind {
                    case .image:
                        if let source = block.source {
                            Button { picture = PictureSelection(source: source) } label: { LocalArtwork(source: source).frame(maxWidth: .infinity).accessibilityLabel(block.alt ?? app.t("图片")) }.buttonStyle(.plain)
                        }
                    case .rule: Divider().padding(.vertical, 6)
                    case .heading: richText(block).font(block.level == 1 ? .title2.bold() : .title3.bold()).padding(.top, 8)
                    case .quote, .callout:
                        richText(block).font(.body).lineSpacing(6).padding(16).frame(maxWidth: .infinity, alignment: .leading).background(.white).overlay(alignment: .leading) { Rectangle().fill(Pit.pink).frame(width: 3) }
                    case .listItem: HStack(alignment: .top) { Text("•").foregroundStyle(Pit.pink); richText(block).lineSpacing(6) }
                    default: richText(block).font(.body).lineSpacing(7)
                    }
                }
            case .failure: Text(app.t("文章暂时无法读取")).foregroundStyle(.secondary)
            }
        }.frame(maxWidth: .infinity, alignment: .leading).textSelection(.enabled)
        .sheet(item: $picture) { value in PictureViewer(source: value.source) }
    }
    func richText(_ block: ArticleBlock) -> Text {
        let translated = app.t(block.text.trimmingCharacters(in: .whitespacesAndNewlines))
        if translated != block.text.trimmingCharacters(in: .whitespacesAndNewlines) { return Text(translated) }
        var result = AttributedString()
        for run in block.runs {
            var span = AttributedString(run.text)
            var intent: InlinePresentationIntent = []
            if run.bold { intent.insert(.stronglyEmphasized) }; if run.italic { intent.insert(.emphasized) }
            span.inlinePresentationIntent = intent
            if run.underline { span.underlineStyle = .single }
            if let link = run.link, let url = URL(string: link), ["https", "http", "mailto"].contains(url.scheme) { span.link = url; span.foregroundColor = Pit.pink }
            result.append(span)
        }
        return Text(result)
    }
}

struct PictureSelection: Identifiable { let source: String; var id: String { source } }
struct PictureViewer: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var app: AppModel
    let source: String
    @State private var scale = 1.0
    @GestureState private var magnify = 1.0
    var body: some View {
        NavigationStack {
            GeometryReader { geometry in
                ScrollView([.horizontal, .vertical]) { LocalArtwork(source: source).frame(width: geometry.size.width * scale * magnify).gesture(MagnifyGesture().updating($magnify) { value, state, _ in state = value.magnification }.onEnded { value in scale = min(max(scale * value.magnification, 1), 4) }).onTapGesture(count: 2) { withAnimation { scale = scale == 1 ? 2 : 1 } } }
            }.background(.black).toolbar { ToolbarItem(placement: .confirmationAction) { Button(app.t("完成")) { dismiss() } } }
        }
    }
}
