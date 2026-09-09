import SwiftUI
import GlfansCore

struct PitHeader: View {
    @EnvironmentObject private var app: AppModel

    var body: some View {
        ZStack {
            HStack {
                Button {
                    withAnimation(.easeOut(duration: 0.2)) { app.entered = false }
                } label: {
                    LocalArtwork(source: "assets/glfans-logo-brush.webp")
                        .frame(width: 34, height: 28)
                }
                .accessibilityLabel(app.t("返回 glfans 首页"))

                Spacer()

                Button { app.showingAbout = true } label: {
                    Image(systemName: "info.circle")
                        .font(.system(size: 21, weight: .medium))
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(app.t("关于 glfans"))
            }

            HStack(spacing: 0) {
                language("zh", short: "中", label: "中文")
                language("en", short: "EN", label: "English")
                language("th", short: "TH", label: "ไทย")
            }
            .frame(height: 26)
            .background(Pit.paperDeep)
        }
        .padding(.horizontal, 16)
        .frame(height: WebMobileDesign.Chrome.headerHeight)
        .background(Pit.paper)
        .overlay(alignment: .bottom) { Rectangle().fill(Pit.ink.opacity(0.72)).frame(height: 0.75) }
    }

    private func language(_ locale: String, short: String, label: String) -> some View {
        Button { app.locale = locale } label: {
            Text(short)
                .font(PitFont.display(10).weight(app.locale == locale ? .bold : .medium))
                .frame(width: 36, height: 26)
                .background(app.locale == locale ? Pit.pink : .clear)
        }
        .accessibilityLabel(label)
        .accessibilityAddTraits(app.locale == locale ? .isSelected : [])
    }
}

struct PitBottomNavigation: View {
    @EnvironmentObject private var app: AppModel
    @EnvironmentObject private var radio: RadioPlayer

    private let items: [(AppSection, String, String)] = [
        (.archive, "film", "档案"),
        (.literature, "quote.bubble", "文学"),
        (.repo, "books.vertical", "REPO"),
        (.memes, "photo", "表情"),
        (.radio, "opticaldisc", "电台")
    ]

    var body: some View {
        ZStack(alignment: .top) {
            LocalArtwork(source: "assets/repo-collection-black-torn-v2.webp", mode: .fill)
                .frame(maxWidth: .infinity)
                .frame(height: WebMobileDesign.Chrome.navigationTextureHeight)
                .clipped()
                .offset(y: WebMobileDesign.Chrome.navigationTextureTop)
                .allowsHitTesting(false)

            HStack(spacing: 4) {
                ForEach(Array(items.enumerated()), id: \.element.0) { index, item in
                    Button {
                        withAnimation(.easeOut(duration: 0.18)) { app.section = item.0 }
                    } label: {
                        tab(item.0, symbol: item.1, label: item.2, index: index)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(app.t(item.0.title))
                    .accessibilityAddTraits(app.section == item.0 ? .isSelected : [])
                }
            }
            .padding(.horizontal, 10)
            .frame(height: WebMobileDesign.Chrome.navigationTabsHeight)
            .padding(.top, WebMobileDesign.Chrome.navigationTopPadding)
            .padding(.bottom, WebMobileDesign.Chrome.navigationBottomPadding)
        }
        .frame(height: WebMobileDesign.Chrome.navigationSpace, alignment: .top)
    }

    private func tab(_ section: AppSection, symbol: String, label: String, index: Int) -> some View {
        let active = app.section == section
        let tilts = [-2.0, 1.6, -1.0, 2.0, -1.4]
        return ZStack {
            LocalArtwork(source: "assets/mobile-nav-paper.webp", mode: .fill)
                .frame(height: 66)
                .colorMultiply(active ? Pit.ink : .white)
            VStack(spacing: 4) {
                Image(systemName: symbol)
                    .font(.system(size: 22, weight: active ? .bold : .regular))
                    .symbolVariant(active ? .fill : .none)
                    .rotationEffect(section == .radio && radio.playing ? .degrees(18) : .zero)
                Text(app.t(label))
                    .font(PitFont.interface(13, locale: app.locale).weight(.bold))
                    .tracking(0.39)
                    .lineLimit(1)
            }
            .foregroundStyle(active ? .white : Pit.ink)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 66)
        .overlay(alignment: .bottom) {
            if active {
                Rectangle()
                    .fill(Pit.pink)
                    .frame(height: 6)
                    .mask(LocalArtwork(source: "assets/mobile-nav-paper.webp", mode: .fill))
            }
        }
        .offset(y: active ? -8 : 8)
        .rotationEffect(.degrees(tilts[index]))
    }
}

struct PitRootChrome: ViewModifier {
    func body(content: Content) -> some View {
        content
            .toolbar(.hidden, for: .navigationBar)
            .background(Pit.paper)
    }
}
