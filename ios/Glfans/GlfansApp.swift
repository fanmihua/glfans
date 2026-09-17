import SwiftUI
import GlfansCore

@main struct GlfansApp: App {
    @StateObject private var app = AppModel()
    @Environment(\.scenePhase) private var scenePhase
    var body: some Scene {
        WindowGroup {
            Group {
                if let catalog = app.catalog {
                    MainTabs(catalog: catalog)
                } else {
                    ContentUnavailableView("内容暂时无法打开", systemImage: "exclamationmark.triangle", description: Text(app.loadError ?? "请重新打开 App"))
                }
            }
            .environmentObject(app)
            .environment(\.locale, app.systemLocale)
            .tint(Pit.pink).foregroundStyle(Pit.ink).preferredColorScheme(.light)
            .buttonStyle(PitTapStyle())
            .task { await app.refreshContent() }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active { Task { await app.refreshContent() } }
            }
            .onOpenURL { url in
                guard url.scheme == "glfans" else { return }
                let section = AppSection(rawValue: url.host ?? "") ?? .archive
                app.enter(section)
                if section == .archive, let id = url.pathComponents.last, let drama = app.catalog?.dramas.first(where: { $0.id == id }) { app.selectedDrama = drama }
                if section == .cp, let id = url.pathComponents.last, app.cpCatalog?.profiles.contains(where: { $0.id == id }) == true { app.selectedCpID = id }
            }
        }
    }
}

struct MainTabs: View {
    @EnvironmentObject var app: AppModel
    let catalog: Catalog
    private var previewSize: CGSize? {
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        if let i = args.firstIndex(of: "--page-size"), args.indices.contains(i+1) {
            let parts = args[i+1].split(separator: "x").compactMap { Double($0) }
            if parts.count == 2 { return CGSize(width: parts[0], height: parts[1]) }
        }
        #endif
        return nil
    }
    var body: some View {
        GeometryReader { geometry in
            let bottom = previewSize == nil ? geometry.safeAreaInsets.bottom : 0
            let size = previewSize ?? CGSize(width: geometry.size.width, height: geometry.size.height + bottom)
            ZStack(alignment: .top) {
                selectedSection.frame(maxWidth: .infinity, maxHeight: .infinity)
                PitHeader().zIndex(10)
                VStack { Spacer(minLength: 0); PitBottomNavigation() }.zIndex(13)
            }
            .environment(\.sourceViewport, size).environment(\.sourceBottomInset, bottom)
            .frame(width: size.width, height: size.height).clipped()
            .ignoresSafeArea(.container, edges: .bottom)
            #if DEBUG
            .background(HomeSnapshotExport(enabled: ProcessInfo.processInfo.arguments.contains("--page-snapshot"),
                                           name: "page-\(app.section.rawValue)-\(app.locale)", size: size))
            #endif
        }
        .background(Pit.paper)
    }

    @ViewBuilder private var repoDestination: some View {
        #if DEBUG
        if let slug = Self.argument("--collection"), let collection = catalog.collections.first(where: { $0.slug == slug }) {
            if let articleSlug = Self.argument("--article"), let article = collection.visibleArticles.first(where: { $0.slug == articleSlug }) { ArticleView(collection: collection, article: article) }
            else { CollectionView(collection: collection) }
        } else { RepoView(catalog: catalog) }
        #else
        RepoView(catalog: catalog)
        #endif
    }
    static func argument(_ key: String) -> String? {
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: key), args.indices.contains(i+1) else { return nil }
        return args[i+1]
    }
    @ViewBuilder private var selectedSection: some View {
        switch app.section {
        case .archive:
            NavigationStack { ArchiveView(catalog: catalog).modifier(PitRootChrome()) }
        case .cp:
            if let cpCatalog = app.cpCatalog { NavigationStack { CpView(catalog: catalog, cpCatalog: cpCatalog).modifier(PitRootChrome()) } }
            else { ContentUnavailableView("百家饭暂时无法打开", systemImage: "person.2") }
        case .repo:
            NavigationStack { repoDestination.modifier(PitRootChrome()) }
        case .memes:
            NavigationStack { MemeView(catalog: catalog).modifier(PitRootChrome()) }
        case .about:
            NavigationStack { AboutView().modifier(PitRootChrome()) }
        case .home, .literature, .radio:
            NavigationStack { ArchiveView(catalog: catalog).modifier(PitRootChrome()) }
        }
    }
}
