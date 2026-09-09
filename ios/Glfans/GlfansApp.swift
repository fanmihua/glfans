import SwiftUI
import GlfansCore

@main struct GlfansApp: App {
    @StateObject private var app = AppModel()
    @StateObject private var radio = RadioPlayer()
    @StateObject private var community = CommunityStore()
    var body: some Scene {
        WindowGroup {
            Group {
                if let catalog = app.catalog {
                    if app.entered { MainTabs(catalog: catalog) }
                    else { HomeView(catalog: catalog) }
                } else {
                    ContentUnavailableView("内容暂时无法打开", systemImage: "exclamationmark.triangle", description: Text(app.loadError ?? "请重新打开 App"))
                }
            }
            .environmentObject(app).environmentObject(radio).environmentObject(community)
            .environment(\.locale, app.systemLocale)
            .tint(Pit.pink).foregroundStyle(Pit.ink).preferredColorScheme(.light)
            .buttonStyle(PitTapStyle())
            .sheet(isPresented: $app.showingAbout) { NavigationStack { AboutView() }.environmentObject(app) }
            .onOpenURL { url in
                guard url.scheme == "glfans" else { return }
                let section = AppSection(rawValue: url.host ?? "") ?? .archive
                if section == .home { withAnimation { app.entered = false }; return }
                if section == .about { app.showingAbout = true; return }
                app.enter(section)
                if section == .archive, let id = url.pathComponents.last, let drama = app.catalog?.dramas.first(where: { $0.id == id }) { app.selectedDrama = drama }
            }
        }
    }
}

struct MainTabs: View {
    @EnvironmentObject var app: AppModel
    let catalog: Catalog
    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 0) {
                PitHeader()
                ZStack(alignment: .bottom) {
                    selectedSection
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    PitBottomNavigation()
                        .padding(.bottom, geometry.safeAreaInsets.bottom)
                }
            }
            .frame(width: geometry.size.width, height: geometry.size.height + geometry.safeAreaInsets.bottom)
        }
        .ignoresSafeArea(.container, edges: .bottom)
        .background(Pit.paper)
    }

    @ViewBuilder private var selectedSection: some View {
        switch app.section {
        case .archive:
            NavigationStack { ArchiveView(catalog: catalog).modifier(PitRootChrome()) }
        case .literature:
            NavigationStack { LiteratureView(catalog: catalog).modifier(PitRootChrome()) }
        case .repo:
            NavigationStack { RepoView(catalog: catalog).modifier(PitRootChrome()) }
        case .memes:
            NavigationStack { MemeView(catalog: catalog).modifier(PitRootChrome()) }
        case .radio:
            NavigationStack { RadioView(catalog: catalog).modifier(PitRootChrome()) }
        case .home, .about:
            NavigationStack { ArchiveView(catalog: catalog).modifier(PitRootChrome()) }
        }
    }
}

struct MiniPlayerInset: ViewModifier {
    @EnvironmentObject var app: AppModel
    @EnvironmentObject var radio: RadioPlayer
    func body(content: Content) -> some View {
        content
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if let track = radio.track, app.section != .radio {
                HStack {
                    Button { app.section = .radio } label: { HStack { Image(systemName: "opticaldisc"); Text(track.name).lineLimit(1).font(.subheadline.weight(.semibold)) }.frame(maxWidth: .infinity, alignment: .leading) }
                    Button { radio.toggle() } label: { Image(systemName: radio.playing ? "pause.fill" : "play.fill").frame(width: 44, height: 44) }.accessibilityLabel(app.t(radio.playing ? "暂停" : "播放"))
                    Button { radio.next() } label: { Image(systemName: "forward.end.fill").frame(width: 44, height: 44) }.accessibilityLabel(app.t("下一首歌"))
                }.padding(.horizontal, 16).background(Pit.ink).foregroundStyle(.white)
            }
        }
    }
}
