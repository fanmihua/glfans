import SwiftUI
import GlfansCore

@MainActor final class AppModel: ObservableObject {
    @Published var section: AppSection = .archive
    @Published var entered = false
    @Published var locale: String { didSet { UserDefaults.standard.set(locale, forKey: "glfans.locale"); loadDictionary() } }
    @Published var followed: Set<String> { didSet { UserDefaults.standard.set(Array(followed), forKey: "glfans.followed") } }
    @Published var followingOnly: Bool { didSet { UserDefaults.standard.set(followingOnly, forKey: "glfans.followingOnly") } }
    @Published var showingAbout = false
    @Published var selectedDrama: Drama?
    let catalog: Catalog?
    @Published var schedule: BroadcastSchedule?
    @Published var scheduleError: String?
    @Published var refreshingSchedule = false
    private var lastScheduleRefresh: Date?
    let loadError: String?
    private var dictionary: [String: String] = [:]
    init() {
        locale = UserDefaults.standard.string(forKey: "glfans.locale") ?? "zh"
        followed = Set(UserDefaults.standard.stringArray(forKey: "glfans.followed") ?? [])
        followingOnly = UserDefaults.standard.bool(forKey: "glfans.followingOnly")
        do {
            catalog = try Catalog.decode(Self.resource("catalog.json"))
            loadError = nil
        } catch { catalog = nil; loadError = error.localizedDescription }
        schedule = try? JSONDecoder().decode(BroadcastSchedule.self, from: Self.resource("schedule.json"))
        loadDictionary()
        if let data = try? Data(contentsOf: Self.scheduleCache), let cached = try? JSONDecoder().decode(BroadcastSchedule.self, from: data), cached.checkedAt >= (schedule?.checkedAt ?? "") { schedule = cached }
        if let index = ProcessInfo.processInfo.arguments.firstIndex(of: "--locale"), ProcessInfo.processInfo.arguments.indices.contains(index + 1) {
            let value = ProcessInfo.processInfo.arguments[index + 1]
            if ["zh", "en", "th"].contains(value) { locale = value; loadDictionary() }
        }
        if let index = ProcessInfo.processInfo.arguments.firstIndex(of: "--section"), ProcessInfo.processInfo.arguments.indices.contains(index + 1),
           let destination = AppSection(rawValue: ProcessInfo.processInfo.arguments[index + 1]) {
            section = destination; entered = destination != .home
        }
    }
    static func resource(_ name: String) throws -> Data {
        guard let url = Bundle.main.resourceURL?.appendingPathComponent("Generated/" + name) else { throw CocoaError(.fileNoSuchFile) }
        return try Data(contentsOf: url)
    }
    func loadDictionary() { dictionary = (try? JSONDecoder().decode([String: String].self, from: Self.resource(locale + ".json"))) ?? [:] }
    func t(_ source: String) -> String {
        guard locale != "zh" else { return source }
        let normalized = source.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
        return dictionary[source] ?? dictionary[normalized] ?? source
    }
    var timeZone: TimeZone { TimeZone(identifier: locale == "zh" ? "Asia/Shanghai" : "Asia/Bangkok")! }
    var systemLocale: Locale { Locale(identifier: locale == "zh" ? "zh_CN" : locale == "th" ? "th_TH" : "en_GB") }
    func toggleFollow(_ id: String) { if followed.contains(id) { followed.remove(id) } else { followed.insert(id) } }
    func enter(_ destination: AppSection) { section = destination; withAnimation(.easeInOut(duration: 0.3)) { entered = true } }
    private static var scheduleCache: URL { FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("glfans-schedule.json") }
    func refreshSchedule(force: Bool = false) async {
        guard !refreshingSchedule else { return }
        if !force, let lastScheduleRefresh, Date().timeIntervalSince(lastScheduleRefresh) < 3600 { return }
        refreshingSchedule = true; defer { refreshingSchedule = false }
        do {
            async let history = fetchSchedule("archive-history")
            async let current = fetchSchedule("archive-schedule")
            let merged = try await BroadcastSchedule.merge(history: history, current: current)
            guard !merged.series.isEmpty, !merged.events.isEmpty else { throw CocoaError(.fileReadCorruptFile) }
            if merged.checkedAt >= (schedule?.checkedAt ?? "") {
                let data = try JSONEncoder().encode(merged)
                try FileManager.default.createDirectory(at: Self.scheduleCache.deletingLastPathComponent(), withIntermediateDirectories: true)
                try data.write(to: Self.scheduleCache, options: .atomic)
                schedule = merged
            }
            scheduleError = nil; lastScheduleRefresh = Date()
        } catch { scheduleError = "排期更新失败，继续显示已保存的排期。" }
    }
    private func fetchSchedule(_ name: String) async throws -> BroadcastSchedule {
        let url = URL(string: "https://raw.githubusercontent.com/fanmihua/glfans/main/src/data/\(name).json")!
        let (data, response) = try await URLSession.shared.data(for: URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 20))
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { throw CocoaError(.fileReadUnknown) }
        return try JSONDecoder().decode(BroadcastSchedule.self, from: data)
    }
}

enum Artwork {
    private static let cache: NSCache<NSString, UIImage> = {
        let value = NSCache<NSString, UIImage>(); value.countLimit = 40; value.totalCostLimit = 64 * 1024 * 1024; return value
    }()
    static func url(_ source: String) -> URL? {
        if source.hasPrefix("https://") { return URL(string: source) }
        let relative = source.trimmingCharacters(in: CharacterSet(charactersIn: "/")).replacingOccurrences(of: ".webp", with: ".png")
        return Bundle.main.resourceURL?.appendingPathComponent("Generated/" + relative)
    }
    static func image(_ source: String) -> UIImage? {
        if let image = cache.object(forKey: source as NSString) { return image }
        guard let url = url(source), url.isFileURL else { return nil }
        guard let image = UIImage(contentsOfFile: url.path) else { return nil }
        let cost = image.cgImage.map { $0.bytesPerRow * $0.height } ?? Int(image.size.width * image.size.height * 4)
        cache.setObject(image, forKey: source as NSString, cost: cost)
        return image
    }
}

struct LocalArtwork: View {
    let source: String
    var mode: ContentMode = .fit
    var body: some View {
        if let image = Artwork.image(source) {
            Image(uiImage: image).resizable().aspectRatio(contentMode: mode)
        } else if let url = Artwork.url(source), !url.isFileURL {
            AsyncImage(url: url) { image in image.resizable().aspectRatio(contentMode: mode) } placeholder: { Rectangle().fill(Pit.paper).overlay(Image(systemName: "photo").foregroundStyle(.secondary)) }
        } else { Rectangle().fill(Pit.paper).overlay(Image(systemName: "photo").foregroundStyle(.secondary)) }
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
