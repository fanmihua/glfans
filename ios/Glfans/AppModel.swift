import SwiftUI
import GlfansCore

@MainActor final class AppModel: ObservableObject {
    @Published var section: AppSection = .archive {
        didSet { if !section.isPubliclyAvailable { section = .archive } }
    }
    @Published var entered: Bool
    @Published var locale: String { didSet { UserDefaults.standard.set(locale, forKey: "glfans.locale"); loadDictionary(); rebuildCalendarIndex() } }
    @Published var followed: Set<String> { didSet { UserDefaults.standard.set(Array(followed), forKey: "glfans.followed") } }
    @Published var followingOnly: Bool { didSet { UserDefaults.standard.set(followingOnly, forKey: "glfans.followingOnly") } }
    @Published var showingAbout = false
    @Published var selectedDrama: Drama?
    @Published var selectedCpID: String { didSet { UserDefaults.standard.set(selectedCpID, forKey: "glfans.selectedCp") } }
    @Published private(set) var catalog: Catalog?
    @Published private(set) var cpCatalog: CpCatalog?
    @Published private(set) var sourceContent: WebsiteContent? = WebsiteContent.shared
    @Published private(set) var contentVersion: String?
    @Published private(set) var contentUpdatedAt: String?
    @Published private(set) var contentLastCheckedAt: Date?
    @Published private(set) var contentError: String?
    @Published private(set) var refreshingContent = false
    private var lastContentCheck: Date?
    private var retryContentAfter: Date?
    private var contentSnapshot: ContentSnapshot?
    @Published var schedule: BroadcastSchedule? { didSet { rebuildCalendarIndex() } }
    @Published private(set) var calendarIndex = CalendarEventIndex(events: [], zone: TimeZone(secondsFromGMT: 0)!)
    @Published var scheduleError: String?
    @Published var refreshingSchedule = false
    private(set) var loadError: String?
    private var dictionary: [String: String] = [:]
    private var calendarDictionary: [String: String] = [:]
    private static let openingSeenKey = "glfans.home-journey-seen.v1"
    init() {
        let arguments = ProcessInfo.processInfo.arguments
        entered = true
        locale = UserDefaults.standard.string(forKey: "glfans.locale") ?? "zh"
        followed = Set(UserDefaults.standard.stringArray(forKey: "glfans.followed") ?? [])
        followingOnly = UserDefaults.standard.bool(forKey: "glfans.followingOnly")
        selectedCpID = UserDefaults.standard.string(forKey: "glfans.selectedCp") ?? "namtanfilm"
        do {
            catalog = try Catalog.decode(Self.resource("catalog.json"))
            loadError = nil
        } catch { catalog = nil; loadError = error.localizedDescription }
        cpCatalog = try? CpCatalog.decode(Self.resource("cp-catalog.json"))
        schedule = try? JSONDecoder().decode(BroadcastSchedule.self, from: Self.resource("schedule.json"))
        loadDictionary()
        let bundled = Self.bundledSnapshot()
        let cached = (try? ContentRepository.cache.load()).flatMap { snapshot -> ContentSnapshot? in
            guard let data = snapshot.files["sourceContent"], (try? JSONDecoder().decode(WebsiteContent.self, from: data)) != nil else { return nil }
            return snapshot
        }
        if let snapshot = cached, snapshot.manifest.generatedAt >= (bundled?.manifest.generatedAt ?? "") {
            apply(snapshot)
        } else if let bundled { apply(bundled) }
        if let index = arguments.firstIndex(of: "--locale"), arguments.indices.contains(index + 1) {
            let value = arguments[index + 1]
            if ["zh", "en", "th"].contains(value) { locale = value; loadDictionary() }
        }
        if let index = arguments.firstIndex(of: "--section"), arguments.indices.contains(index + 1),
           let destination = AppSection(rawValue: arguments[index + 1]) {
            section = destination.isPubliclyAvailable ? destination : .archive; entered = true
        }
        if let index = arguments.firstIndex(of: "--cp"), arguments.indices.contains(index + 1) { selectedCpID = arguments[index + 1] }
        rebuildCalendarIndex()
    }
    private func rebuildCalendarIndex() {
        calendarIndex = CalendarEventIndex(events: schedule?.events ?? [], zone: timeZone)
    }
    static func resource(_ name: String) throws -> Data {
        guard let url = Bundle.main.resourceURL?.appendingPathComponent("Generated/" + name) else { throw CocoaError(.fileNoSuchFile) }
        return try Data(contentsOf: url)
    }
    func loadDictionary() {
        dictionary = contentSnapshot?.dictionaries[locale] ?? (try? JSONDecoder().decode([String: String].self, from: Self.resource(locale + ".json"))) ?? [:]
        calendarDictionary = contentSnapshot?.calendarDictionaries[locale] ?? (try? JSONDecoder().decode([String: String].self, from: Self.resource("calendar-" + locale + ".json"))) ?? [:]
        if locale != "zh", let data = try? Self.resource("native-copy.json"), let copy = try? JSONDecoder().decode([String: [String]].self, from: data) {
            let index = locale == "en" ? 0 : 1
            for (key, values) in copy where dictionary[key] == nil && values.indices.contains(index) { dictionary[key] = values[index] }
        }
    }
    func calendarCopy(_ key: String) -> String { calendarDictionary[key] ?? key }
    func t(_ source: String) -> String {
        guard locale != "zh" else { return source }
        let normalized = source.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
        return dictionary[source] ?? dictionary[normalized] ?? source
    }
    var timeZone: TimeZone { TimeZone(identifier: locale == "zh" ? "Asia/Shanghai" : "Asia/Bangkok")! }
    var systemLocale: Locale { Locale(identifier: locale == "zh" ? "zh_CN" : locale == "th" ? "th_TH" : "en_GB") }
    func toggleFollow(_ id: String) { if followed.contains(id) { followed.remove(id) } else { followed.insert(id) } }
    func enter(_ destination: AppSection) { section = destination.isPubliclyAvailable ? destination : .archive; withAnimation(.easeInOut(duration: 0.3)) { entered = true } }
    func markOpeningComplete() { UserDefaults.standard.set(true, forKey: Self.openingSeenKey) }
    func showOpening() { enter(.archive) }
    func cpCopy(_ section: CpCopySection, _ key: String) -> String { cpCatalog?.copy(section, key, locale: locale) ?? key }
    private static func bundledSnapshot() -> ContentSnapshot? {
        guard let data = try? resource("content-manifest.json"), let manifest = try? ContentManifest.decode(data) else { return nil }
        var files: [String: Data] = [:]
        for (key, filename) in ContentManifest.filenames { files[key] = try? resource(filename) }
        return try? ContentSnapshot(manifest: manifest, files: files)
    }
    private func apply(_ snapshot: ContentSnapshot) {
        guard let sourceData = snapshot.files["sourceContent"], let source = try? JSONDecoder().decode(WebsiteContent.self, from: sourceData) else { return }
        contentSnapshot = snapshot; sourceContent = source
        Artwork.configure(snapshot.manifest)
        catalog = snapshot.catalog; cpCatalog = snapshot.cpCatalog; schedule = snapshot.schedule
        contentVersion = snapshot.manifest.version; contentUpdatedAt = snapshot.manifest.generatedAt
        if let current = selectedDrama { selectedDrama = snapshot.catalog.dramas.first { $0.id == current.id } }
        if !snapshot.cpCatalog.profiles.contains(where: { $0.id == selectedCpID }), let first = snapshot.cpCatalog.profiles.first { selectedCpID = first.id }
        loadError = nil; loadDictionary()
    }
    /// The calendar, app lifecycle and manual refresh share one release and one throttle.
    func refreshContent(force: Bool = false) async {
        guard !refreshingContent else { return }
        if !force, let lastContentCheck, Date().timeIntervalSince(lastContentCheck) < 3600 { return }
        if !force, let retryContentAfter, retryContentAfter > Date() { return }
        refreshingContent = true; refreshingSchedule = true
        defer { refreshingContent = false; refreshingSchedule = false }
        do {
            if let snapshot = try await ContentRepository.shared.refresh(currentVersion: contentVersion) { apply(snapshot) }
            contentError = nil; scheduleError = nil; contentLastCheckedAt = Date()
            lastContentCheck = Date(); retryContentAfter = nil
        } catch is CancellationError { }
        catch let error as URLError where error.code == .cancelled { }
        catch {
            retryContentAfter = Date().addingTimeInterval(60)
            contentError = "内容更新失败，继续显示已保存的内容。"
            scheduleError = "排期更新失败，继续显示已保存的排期。"
        }
    }
    func refreshSchedule(force: Bool = false) async { await refreshContent(force: force) }

}

@MainActor enum Artwork {
    private static let cache: NSCache<NSString, UIImage> = {
        let value = NSCache<NSString, UIImage>(); value.countLimit = 80; value.totalCostLimit = 96 * 1024 * 1024; return value
    }()
    private static let bundledAssets: [String: ContentFile] = {
        guard let data = try? AppModel.resource("content-manifest.json"), let manifest = try? ContentManifest.decode(data) else { return [:] }
        return manifest.assets
    }()
    private static var assets: [String: ContentFile] = [:]
    static func configure(_ manifest: ContentManifest) { assets = manifest.assets }
    private static func descriptor(_ source: String) -> ContentFile? {
        assets[source] ?? assets.values.first(where: { $0.url == source })
    }
    private static func cacheKey(_ source: String) -> NSString { (descriptor(source)?.sha256 ?? "bundle:" + source) as NSString }
    private static func bundleURL(_ source: String) -> URL? {
        guard source.hasPrefix("assets/"), !source.contains(".."), !source.contains("%"), !source.contains("\\") else { return nil }
        if let current = descriptor(source), bundledAssets[source]?.sha256 != current.sha256 { return nil }
        let relative = source.replacingOccurrences(of: ".webp", with: ".png")
        let converted = Bundle.main.resourceURL?.appendingPathComponent("Generated/" + relative)
        if let converted, FileManager.default.fileExists(atPath: converted.path) { return converted }
        return Bundle.main.resourceURL?.appendingPathComponent("Generated/" + source)
    }
    static func url(_ source: String) -> URL? {
        if let file = descriptor(source) {
            let cached = ContentRepository.artworkDirectory.appendingPathComponent(file.sha256)
            if FileManager.default.fileExists(atPath: cached.path) { return cached }
            return bundleURL(source) ?? URL(string: file.url)
        }
        return bundleURL(source)
    }
    static func image(_ source: String) -> UIImage? {
        let key = cacheKey(source)
        if let image = cache.object(forKey: key) { return image }
        var result: UIImage?
        if let file = descriptor(source), let data = try? Data(contentsOf: ContentRepository.artworkDirectory.appendingPathComponent(file.sha256)), (try? file.verify(data)) != nil { result = UIImage(data: data) }
        if result == nil, let url = bundleURL(source) { result = UIImage(contentsOfFile: url.path) }
        if let result { remember(result, key: key) }
        return result
    }
    static func load(_ source: String) async -> UIImage? {
        if let image = image(source) { return image }
        guard let file = descriptor(source), let data = try? await ContentRepository.shared.artwork(file), let image = UIImage(data: data) else { return nil }
        remember(image, key: file.sha256 as NSString)
        return image
    }
    private static func remember(_ image: UIImage, key: NSString) {
        let cost = image.cgImage.map { $0.bytesPerRow * $0.height } ?? Int(image.size.width * image.size.height * 4)
        cache.setObject(image, forKey: key, cost: cost)
    }
}

/// All image surfaces observe content releases and resolve the same validated on-disk cache.
struct LoadedArtwork<Content: View>: View {
    @EnvironmentObject private var app: AppModel
    let source: String
    @ViewBuilder let content: (UIImage?) -> Content
    @State private var loaded: UIImage?
    @State private var loadedIdentity: String?
    private var identity: String { (app.contentVersion ?? "bundled") + ":" + source }
    var body: some View {
        content(loadedIdentity == identity ? loaded : Artwork.image(source))
            .task(id: identity) {
                loaded = Artwork.image(source); loadedIdentity = identity
                let value = await Artwork.load(source)
                guard !Task.isCancelled else { return }
                loaded = value
            }
    }
}

struct LocalArtwork: View {
    let source: String
    var mode: ContentMode = .fit
    var body: some View {
        LoadedArtwork(source: source) { image in
            if let image { Image(uiImage: image).resizable().aspectRatio(contentMode: mode) }
            else { Rectangle().fill(Pit.paper).overlay(Image(systemName: "photo").foregroundStyle(.secondary)) }
        }
    }
}

enum Pit {
    static let paper = Color(red: 247 / 255, green: 247 / 255, blue: 244 / 255)
    static let paperDeep = Color(red: 233 / 255, green: 233 / 255, blue: 230 / 255)
    static let ink = Color(red: 9 / 255, green: 9 / 255, blue: 9 / 255)
    static let pink = Color(red: 1, green: 92 / 255, blue: 168 / 255)
}

/// Direct SwiftUI equivalents of `src/styles/tokens.css` font families.
enum PitFont {
    static func display(_ size: CGFloat) -> Font { .custom("Manrope-ExtraLight", size: size) }
    static func headline(_ size: CGFloat) -> Font { .custom("RobotoCondensed-Regular", size: size) }
    static func hero(_ size: CGFloat) -> Font { .custom("AlibabaPuHuiTi-Heavy", size: size) }
    static func thai(_ size: CGFloat) -> Font { .custom("NotoSansThai-Regular", size: size) }

    static func interface(_ size: CGFloat, locale: String) -> Font {
        locale == "th" ? thai(size) : headline(size)
    }
}

/// Values copied from the website mobile selectors. The selector beside each
/// group is the source contract for its SwiftUI counterpart.
enum WebMobileDesign {
    enum Chrome {
        // src/mobile-section-nav.css @media (max-width: 760px)
        static let headerHeight: CGFloat = 46
        static let navigationSpace: CGFloat = 90
        static let navigationTabsHeight: CGFloat = 74
        static let navigationTopPadding: CGFloat = 6
        static let navigationBottomPadding: CGFloat = 10
        static let navigationTextureTop: CGFloat = 12
        static let navigationTextureHeight: CGFloat = 180
    }

    enum ArchiveOverview {
        // src/archive-page.css @media (max-width: 760px)
        static let stageTopOffset: CGFloat = 158
        static let filmHeadingHorizontalInset: CGFloat = 18
        static let filmHeadingBottom: CGFloat = 10
        static let filmShellVerticalPadding: CGFloat = 22
        static let filmWidthRatio: CGFloat = 0.60
        static let filmWidthMin: CGFloat = 220
        static let filmWidthMax: CGFloat = 280
        static let filmGap: CGFloat = 8
        static let yearStampWidthRatio: CGFloat = 0.68
        static let yearStampTop: CGFloat = 34
        static let yearStampHorizontal: CGFloat = 16
        static let yearStampBottom: CGFloat = 15
    }
}

struct PaperHeading: View {
    @EnvironmentObject var app: AppModel
    let title: String
    let subtitle: String
    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(subtitle).font(.system(.caption, design: .monospaced).weight(.bold)).tracking(2)
            Text(app.t(title)).font(.system(size: 36, weight: .black, design: .rounded)).fixedSize(horizontal: false, vertical: true)
            Rectangle().fill(Pit.pink).frame(width: 72, height: 5).rotationEffect(.degrees(-3))
        }.frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 12)
    }
}

struct PaperButton: ViewModifier {
    func body(content: Content) -> some View {
        content.font(.headline).padding(.horizontal, 18).frame(minHeight: 48).background(Pit.ink).foregroundStyle(.white).clipShape(RoundedRectangle(cornerRadius: 7))
    }
}
extension View { func pitButton() -> some View { modifier(PaperButton()) } }

/// Keep source geometry and colors while making the entire label rectangle
/// interactive. PlainButtonStyle can restrict Path icons to their painted area,
/// even when the icon is placed inside a transparent 44-point frame.
struct SourceButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .contentShape(.interaction, Rectangle())
            .opacity(enabled ? (configuration.isPressed ? 0.65 : 1) : 0.4)
    }
}

struct PitTapStyle: ButtonStyle {
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.frame(minWidth: 44, minHeight: 44).contentShape(Rectangle()).opacity(enabled ? (configuration.isPressed ? 0.65 : 1) : 0.4)
    }
}

struct RootToolbar: ViewModifier {
    @EnvironmentObject var app: AppModel
    func body(content: Content) -> some View {
        content.toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button { withAnimation { app.entered = false } } label: { Text("glfans").font(.system(.title3, design: .rounded).weight(.black)).foregroundStyle(Pit.ink) }.accessibilityLabel(app.t("返回 glfans 首页"))
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button { app.showingAbout = true } label: { Image(systemName: "info.circle") }.accessibilityLabel(app.t("关于 glfans"))
            }
        }.toolbarBackground(Pit.paper, for: .navigationBar).toolbarBackground(.visible, for: .navigationBar)
    }
}
