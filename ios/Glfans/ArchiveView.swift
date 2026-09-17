import SwiftUI
import GlfansCore

struct ArchiveView: View {
    @EnvironmentObject var app: AppModel
    let catalog: Catalog
    @State private var year: String?
    @State private var activeOverviewYear: String? = "2024"
    @State private var calendarOpen = false
    var body: some View {
        Group {
            if let year {
                ArchiveYearView(catalog: catalog, year: year,
                                initialDrama: app.selectedDrama?.year == year ? app.selectedDrama?.id : nil,
                                back: { self.year = nil; app.selectedDrama = nil },
                                changeYear: { self.year = $0; app.selectedDrama = nil },
                                openCalendar: { calendarOpen = true }).id(year)
            } else {
                ArchiveOverview(catalog: catalog, activeYear: $activeOverviewYear,
                                openCalendar: { calendarOpen = true }, openYear: { year = $0 })
            }
        }.fullScreenCover(isPresented: $calendarOpen) {
            CalendarView().sourceSheet(fraction:0.9)
        }
        .onChange(of: app.selectedDrama) { _, drama in if let drama { year = drama.year } }
        .onAppear {
            if let drama = app.selectedDrama { year = drama.year }
            #if DEBUG
            let args = ProcessInfo.processInfo.arguments
            if let i = args.firstIndex(of: "--archive-year"), args.indices.contains(i+1) { year = args[i+1] }
            if args.contains("--calendar") { calendarOpen = true }
            #endif
        }
    }
}

/// Exact mobile selectors from ArchivePage.jsx / archive-page.css.
private struct ArchiveOverview: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.sourceViewport) private var viewport
    @Environment(\.sourceBottomInset) private var bottom
    let catalog: Catalog
    @Binding var activeYear: String?
    let openCalendar: () -> Void
    let openYear: (String) -> Void
    private var activeIndex: Int { catalog.years.firstIndex(of: activeYear ?? "2024") ?? 2 }
    var body: some View {
        let w = viewport.width, filmW = min(280, max(220, viewport.width * 0.6))
        let filmH = filmW * 4 / 3 + 44
        let stageH = max(viewport.height - 50 - bottom, 204 + 168 + 50 + filmH - 14)
        ScrollView {
            ZStack(alignment: .topLeading) {
                SourceLine(text: "ARCHIVE", size: w * 0.27, weight: 700, kern: w * 0.0027, lineHeight: w * 0.216)
                    .opacity(0.025).position(x: w / 2, y: 100 + w * 0.108).accessibilityHidden(true)
                LocalArtwork(source: "assets/home/freenbecky-card-v1.webp").frame(width: 138, height: 138 * 0.667)
                    .saturation(0.88).contrast(1.02).opacity(0.82).rotationEffect(.degrees(-5))
                    .position(x: -50 + 69, y: 58 + 138 * 0.667 / 2).accessibilityHidden(true)
                LocalArtwork(source: "assets/home/lingorm-card-v1.webp").frame(width: 136, height: 136)
                    .saturation(0.88).contrast(1.02).opacity(0.82).scaleEffect(0.85).rotationEffect(.degrees(5))
                    .position(x: w + 48 - 68, y: 62 + 68).accessibilityHidden(true)
                ArchiveMasthead(annual: false, width: w, openCalendar: openCalendar)
                    .frame(width: w - 60).at(x: 30, y: 158)
                HStack(alignment: .bottom) {
                    SourceLine(text: app.t("按年份归档"), size: 11, weight: 700)
                        .padding(.trailing, 4).padding(.bottom, 4)
                        .frame(height: 30, alignment: .center)
                        .overlay(alignment: .bottom) { Rectangle().fill(Pit.pink).frame(height: 2) }
                    Spacer()
                    HStack(alignment: .firstTextBaseline, spacing: 7) {
                        SourceLine(text: activeYear ?? "2024", size: 13, weight: 700, color: UIColor(Pit.pink))
                        SourceLine(text: String(format: "%02d / %02d", activeIndex + 1, catalog.years.count), size: 8, weight: 700, kern: 1.12, color: UIColor(Pit.ink.opacity(0.52)))
                    }.padding(.bottom, 2)
                }.frame(width: w - 36, height: 30).at(x: 18, y: stageH - filmH - 40)
                ScrollViewReader { reader in
                    ScrollView(.horizontal) {
                        HStack(spacing: 8) {
                            ForEach(catalog.years, id: \.self) { year in
                                let drama = catalog.dramas.first { $0.id == catalog.archiveRepresentativeIds[year] } ?? catalog.dramas(in: year).first
                                Button { openYear(year) } label: {
                                    ArchiveYearFrame(year: year, drama: drama, count: catalog.dramas(in: year).count, active: activeYear == year)
                                        .frame(width: filmW, height: filmW * 4 / 3).offset(y: activeYear == year ? -2 : 0)
                                }.buttonStyle(SourceButtonStyle()).id(year).accessibilityIdentifier("archive-year-\(year)")
                            }
                        }.scrollTargetLayout().padding(.vertical, 22)
                    }.contentMargins(.horizontal, max(0, (w - filmW) / 2), for: .scrollContent)
                        .scrollIndicators(.hidden).scrollTargetBehavior(.viewAligned)
                        .scrollPosition(id: $activeYear, anchor: .center)
                        .onAppear { reader.scrollTo(activeYear ?? "2024", anchor: .center) }
                }.frame(width: w, height: filmH).background(FilmPerforations()).at(x: 0, y: stageH - filmH)
            }.frame(width: w, height: stageH).clipped()
        }.scrollIndicators(.hidden).background(Pit.paper)
    }
}

private struct ArchiveYearFrame: View {
    @EnvironmentObject var app: AppModel
    let year: String
    let drama: Drama?
    let count: Int
    let active: Bool
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .topLeading) {
                SourcePhoto(source: drama?.image ?? "", focus: drama?.focus ?? "50% 40%")
                    .saturation(active ? 0.9 : 0).contrast(active ? 1.03 : 1.12).scaleEffect(active ? 1.035 : 1)
                VStack(alignment: .leading, spacing: 0) {
                    SourceLine(text: "ARCHIVE YEAR", size: 7, weight: 700, kern: 0.98, color: active ? UIColor(Pit.pink) : .white.withAlphaComponent(0.72))
                    SourceLine(text: year, size: 48, family: "AlibabaPuHuiTi-Heavy", weight: 900, kern: -3.36, lineHeight: 44.16, color: .white).padding(.top, 2).padding(.bottom, 4)
                    SourceLine(text: "\(count)\(app.t(" 部剧集"))", size: 7, weight: 700, kern: 0.98, color: active ? UIColor(Pit.pink) : .white.withAlphaComponent(0.72))
                }.padding(.top, 34).padding(.horizontal, 16).padding(.bottom, 15)
                    .frame(width: g.size.width * 0.68, alignment: .leading)
                    .background(LinearGradient(stops: [.init(color: Pit.ink.opacity(0.92), location: 0), .init(color: Pit.ink.opacity(0.66), location: 0.66), .init(color: .clear, location: 1)], startPoint: .leading, endPoint: .trailing))
            }.clipped().overlay(Rectangle().strokeBorder(active ? Pit.pink : Pit.paper.opacity(0.5), lineWidth: active ? 3 : 1))
        }.accessibilityElement(children: .ignore).accessibilityLabel(year + " " + app.t(drama?.title ?? ""))
    }
}

struct FilmPerforations: View {
    var body: some View {
        Canvas { context, size in
            context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Pit.ink))
            for x in stride(from: 26.0, to: size.width, by: 56) {
                for y in [CGFloat(7), size.height - 16] {
                    context.fill(Path(CGRect(x: x, y: y, width: 14, height: 9)), with: .color(Pit.paper.opacity(0.98)))
                }
            }
        }.accessibilityHidden(true)
    }
}

struct ArchiveMasthead: View {
    @EnvironmentObject private var app: AppModel
    let annual: Bool
    let width: CGFloat
    let openCalendar: () -> Void
    private var chinese: Bool { app.locale == "zh" }
    private var titleSize: CGFloat { annual ? min(72, max(50, width * 0.16)) : min(86, max(61, width * 0.193)) }
    private var englishSize: CGFloat { annual ? min(32, max(23, width * 0.07)) : min(42, max(30, width * 0.097)) }
    private var scales: [CGFloat] { annual ? [1, 1.08, 0.96, 1.05] : [0.93, 1.04, 0.96, 1.06] }
    var body: some View {
        VStack(alignment: annual ? .leading : .center, spacing: 0) {
            if chinese {
                HStack(alignment: .bottom, spacing: 0) {
                    ForEach(Array((annual ? "年度胶卷" : "考古档案").enumerated()), id: \.offset) { i, char in
                        let size = titleSize * scales[i]
                        SourceLine(text: String(char), size: size, family: "AlibabaPuHuiTi-Heavy",
                                   weight: [780,950,760,950][i], kern: -(annual ? 0.13 : 0.1) * titleSize,
                                   lineHeight: size * (annual ? 0.9 : 0.78),
                                   stroke: annual ? [0, size * 0.012, 0, size * 0.016][i] : [0.8,2,0.55,1.85][i])
                            .offset(y: size * (annual ? [0.05,-0.02,0.08,-0.01][i] : [-0.02,0.035,-0.025,0.02][i]))
                            .rotationEffect(.degrees([-3,1,-1.5,annual ? 2.5 : 2][i]), anchor: .bottom)
                    }
                }.padding(.trailing, annual ? titleSize * 0.06 : 0).padding(.bottom, annual ? titleSize * 0.06 : 0)
                    .accessibilityElement(children: .ignore).accessibilityLabel(annual ? "年度胶卷" : "考古档案")
            } else {
                let size = annual ? min(50, max(34, width * 0.09)) : min(58, max(36, width * 0.1))
                SourceParagraph(source: SourceLine(text: app.t(annual ? "年度胶卷" : "考古档案"), size: size,
                    family: app.locale == "th" ? "NotoSansThai-Regular" : "AlibabaPuHuiTi-Heavy", weight: 900, kern: -size * 0.035,
                    lineHeight: size * (annual ? 1.25 : 1.3)), maxWidth: width - (annual ? 44 : 60))
                    .rotationEffect(.degrees(-2), anchor: .bottom)
            }
            SourceLine(text: app.t(annual ? "YEAR ARCHIVE" : "PIT ARCHIVE"), size: englishSize, family: "RobotoCondensed-Regular", weight: 760,
                       kern: englishSize * (annual ? -0.02 : 0.04), lineHeight: englishSize * (annual ? 0.92 : 1), color: UIColor(Pit.pink))
                .background(alignment: .bottom) {
                    SourceTexture("assets/repo-collection-pink-brush-v1.webp")
                        .frame(height: englishSize * (annual ? 0.3 : 0.38))
                        .padding(.horizontal, -englishSize * 0.18)
                        .rotationEffect(.degrees(annual ? -2 : -1.4)).offset(y: englishSize * (annual ? 0.33 : 0.31))
                }.rotationEffect(.degrees(annual ? 0 : -1.8))
                .padding(.top, annual ? 16 : englishSize * 0.2).padding(.leading, annual ? 2 : 0)
            Button(action: openCalendar) {
                HStack(spacing: annual ? 10 : 8) {
                    SourceIcon("CalendarBlank", size: 18)
                    SourceLine(text: app.t("查看播出日历"), size: annual ? 12 : 11, weight: 700, color: .white)
                    SourceIcon("ArrowRight", size: 18).foregroundStyle(Pit.pink)
                }.foregroundStyle(.white).padding(.horizontal, annual ? 17 : 16).frame(height: 44).background(Pit.ink)
            }.buttonStyle(SourceButtonStyle()).rotationEffect(.degrees(annual ? -1.5 : -1.4))
                .padding(.top, annual ? 22 : 16).padding(.leading, annual ? 8 : 0).accessibilityIdentifier("open-calendar")
        }.frame(maxWidth: .infinity, alignment: annual ? .leading : .center)
        .overlay {
            if !annual {
                GeometryReader { g in
                    LocalArtwork(source: "assets/about/annotation-loop-arrow-v1.webp").frame(width: 31)
                        .rotationEffect(.degrees(-30)).position(x: -g.size.width * 0.01 + 15.5, y: g.size.height * 0.31 + 38)
                    LocalArtwork(source: "assets/about/annotation-loop-arrow-v1.webp").frame(width: 28)
                        .rotationEffect(.degrees(158)).position(x: g.size.width * 1.01 - 14, y: g.size.height * 0.17 + 34)
                    LocalArtwork(source: "assets/repo-handdrawn-heart-pink.webp").frame(width: 22, height: 22)
                        .rotationEffect(.degrees(10)).position(x: g.size.width * 0.99 - 11, y: g.size.height * 0.64 + 11)
                }.allowsHitTesting(false).accessibilityHidden(true)
            }
        }
    }
}

private struct ArchiveYearView: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.sourceViewport) private var viewport
    @Environment(\.sourceBottomInset) private var bottom
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let catalog: Catalog
    let year: String
    let initialDrama: String?
    let back: () -> Void
    let changeYear: (String) -> Void
    let openCalendar: () -> Void
    @State private var selected: String?
    @State private var centered: String?
    @State private var dragged = false
    @State private var revealed = false
    @State private var filmTop:CGFloat = .greatestFiniteMagnitude
    private var dramas: [Drama] { catalog.dramas(in: year) }
    var body: some View {
        let w = viewport.width, cardW = min(180, max(144, viewport.width * 0.4))
        ScrollViewReader { vertical in
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Button(action: back) {
                        HStack(spacing: 0) {
                            SourceLine(text: app.t("← 返回年份"), size: 9, weight: 700, kern: 0.63).padding(.horizontal, 8).frame(height: 28).background(Color(red: 1, green: 197/255, blue: 223/255))
                            SourceLine(text: year, size: 18, family: "RobotoCondensed-Regular", weight: 700, lineHeight: 18, color: .white).padding(.horizontal, 9).frame(height: 28).background(Pit.ink)
                        }.rotationEffect(.degrees(-2)).frame(minHeight: 44)
                    }.padding(.leading, 22).accessibilityLabel(app.t("返回全部年份"))
                    ArchiveMasthead(annual: true, width: w, openCalendar: openCalendar).padding(.horizontal, 22).padding(.top, 20).padding(.bottom, 18)
                    HStack(spacing: 10) {
                        ScrollView(.horizontal) {
                            HStack(spacing: 8) {
                                ForEach(catalog.years, id: \.self) { value in
                                    Button { changeYear(value) } label: {
                                        SourceLine(text: value, size: 15, family: "RobotoCondensed-Regular", weight: 700, color: UIColor(year == value ? Pit.pink : Pit.ink))
                                            .frame(minWidth: 42, minHeight: 44)
                                            .overlay(alignment: .bottom) { if year == value { Rectangle().fill(Pit.pink).frame(height: 2).rotationEffect(.degrees(-2)).padding(.bottom, 5) } }
                                    }.accessibilityIdentifier("switch-year-\(value)")
                                }
                            }
                        }.scrollIndicators(.hidden)
                        HStack(alignment: .firstTextBaseline, spacing: 3) {
                            SourceLine(text: String(format: "%02d", dramas.count), size: 16, family: "RobotoCondensed-Regular", weight: 800, color: UIColor(Pit.pink))
                            SourceLine(text: app.t("部剧集"), size: 9, family: "RobotoCondensed-Regular", weight: 650, color: UIColor(Pit.ink.opacity(0.52)))
                        }
                    }.frame(height: 44).padding(.horizontal, 16)
                    ScrollViewReader { horizontal in
                        ScrollView(.horizontal) {
                            HStack(alignment: .top, spacing: 8) {
                                ForEach(dramas) { drama in
                                    Button {
                                        selected = drama.id
                                        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.24)) { centered = drama.id; horizontal.scrollTo(drama.id, anchor: .center) }
                                    } label: {
                                        VStack(alignment: .leading, spacing: 0) {
                                            SourcePhoto(source: drama.image, focus: drama.focus ?? "50% 40%")
                                                .frame(width: cardW - 6, height: (cardW - 6) * 4 / 3).saturation(selected == drama.id ? 1 : 0).contrast(selected == drama.id ? 1 : 1.14)
                                            VStack(alignment: .leading, spacing: 4) {
                                                Text(drama.startDate.replacingOccurrences(of: "-", with: ".")).sourceFont(9, weight: 700).tracking(0.9).foregroundStyle(selected == drama.id ? Pit.pink : .white.opacity(0.72))
                                                Text(app.t(drama.title)).sourceFont(12, weight: 700).fixedSize(horizontal: false, vertical: true).foregroundStyle(.white)
                                            }.padding(.horizontal, 9).padding(.vertical, 6).frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                                                .overlay(alignment: .top) { Rectangle().fill(Pit.paper.opacity(0.36)).frame(height: 1) }
                                        }.padding(3).frame(width: cardW).background(Pit.ink)
                                            .overlay(Rectangle().strokeBorder(selected == drama.id ? Pit.pink : Pit.paper.opacity(0.5), lineWidth: 3))
                                    }.buttonStyle(SourceButtonStyle()).id(drama.id).accessibilityIdentifier("drama-\(drama.id)").accessibilityAddTraits(selected==drama.id ? .isSelected:[])
                                }
                            }.scrollTargetLayout().padding(.top, 22).padding(.bottom, 21)
                        }.contentMargins(.horizontal, (w - cardW) / 2, for: .scrollContent)
                            .scrollIndicators(.hidden).scrollTargetBehavior(.viewAligned).scrollPosition(id: $centered, anchor: .center)
                            .simultaneousGesture(DragGesture(minimumDistance: 8).onChanged { value in if abs(value.translation.width) > abs(value.translation.height) { dragged = true } })
                            .background(FilmPerforations()).accessibilityIdentifier("annual-film")
                            .background(GeometryReader {g in
                                Color.clear.preference(key:AnnualFilmPosition.self,value:g.frame(in:.named("annual-reading")).minY)
                            })
                            .overlay(alignment:.top) {Color.clear.frame(height:1).offset(y:-58).id("film")}
                            .onAppear { let id = initialDrama ?? dramas.first?.id; selected = id; centered = id; if let id { horizontal.scrollTo(id, anchor: .center) } }
                            .task(id: centered) {
                                guard let centered else { return }
                                do { try await Task.sleep(for: .milliseconds(160)) } catch { return }
                                selected = centered
                                if dragged && !revealed {
                                    revealed = true
                                    if filmTop>58 {
                                        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.35)) { vertical.scrollTo("film", anchor: .top) }
                                    }
                                }
                            }
                    }.padding(.top, 4)
                    if let drama = dramas.first(where: { $0.id == selected }) ?? dramas.first {
                        DramaDetails(drama: drama).padding(.horizontal, 24).padding(.top, 24).padding(.bottom, 74)
                    }
                }.padding(.top, 58).padding(.bottom, 90 + bottom)
            }.coordinateSpace(name:"annual-reading").onPreferenceChange(AnnualFilmPosition.self) {filmTop=$0}
                .scrollIndicators(.hidden).buttonStyle(SourceButtonStyle())
        }
    }
}

private struct AnnualFilmPosition:PreferenceKey {
    static var defaultValue:CGFloat = .greatestFiniteMagnitude
    static func reduce(value:inout CGFloat,nextValue:()->CGFloat) {value=nextValue()}
}

struct DramaDetails: View {
    @EnvironmentObject var app: AppModel
    let drama: Drama
    private var range: String {
        let start = drama.startDate.replacingOccurrences(of: "-", with: ".")
        return drama.endDate.map { start + " — " + $0.replacingOccurrences(of: "-", with: ".") } ?? app.t("\(start) 起")
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(range).sourceFont(11, weight: 700).tracking(0.66).foregroundStyle(Pit.pink)
            Text(app.t(drama.title)).sourceFont(28, weight: 800).tracking(-0.42).fixedSize(horizontal: false, vertical: true).padding(.top, 8)
            Text(drama.titleEn.uppercased()).sourceFont(10, family: "RobotoCondensed-Regular", weight: 650).tracking(0.6).foregroundStyle(Pit.ink.opacity(0.58)).padding(.top, 5)
            SourceFlow(spacing: 14, rowSpacing: 8) {
                fact("播出", app.t(drama.weekday ?? "") + " · " + app.t(drama.status))
                fact("集数", drama.episodes.map { app.t("\($0) 集") } ?? app.t("待公布"))
                fact("平台", drama.platforms.isEmpty ? drama.company : drama.platforms.joined(separator: " / "))
            }.padding(.top, 11)
            HStack(alignment: .firstTextBaseline, spacing: 7) {
                Text(app.t("主演")).sourceFont(8, weight: 750).foregroundStyle(Pit.pink)
                Text(drama.cast.map{app.t($0)}.joined(separator: " / ")).sourceFont(9, weight: 650).foregroundStyle(Pit.ink.opacity(0.76)).fixedSize(horizontal: false, vertical: true)
            }.padding(.top, 9)
            SourceTexture("assets/repo-handdrawn-underline-pink.webp").frame(height: 10).padding(.trailing, 58).padding(.top, 9).padding(.bottom, 10)
            Text(app.t(drama.summary)).sourceFont(13).foregroundStyle(Pit.ink.opacity(0.68)).lineSpacing(13 * 0.25).fixedSize(horizontal: false, vertical: true)
        }.frame(maxWidth: .infinity, alignment: .leading)
            .overlay(alignment: .bottomTrailing) {
                LocalArtwork(source: "assets/repo-handdrawn-heart-pink.webp").frame(width: 29, height: 29)
                    .rotationEffect(.degrees(-13)).offset(x: 6, y: 34).accessibilityHidden(true)
            }
    }
    private func fact(_ label: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 5) {
            Text(app.t(label)).sourceFont(8, weight: 750).foregroundStyle(Pit.pink)
            Text(value).sourceFont(9, weight: 650).foregroundStyle(Pit.ink.opacity(0.74)).fixedSize(horizontal: false, vertical: true)
        }
    }
}

/// Flex-wrap for original metadata/chips; keeps full translated text visible.
struct SourceFlow: Layout {
    var spacing: CGFloat = 8
    var rowSpacing: CGFloat = 8
    func layout(_ proposal: ProposedViewSize, _ subviews: Subviews) -> (CGSize, [CGPoint]) {
        let width = proposal.width ?? 350
        var x: CGFloat = 0, y: CGFloat = 0, row: CGFloat = 0, points: [CGPoint] = []
        for view in subviews {
            let size = view.sizeThatFits(.init(width: width, height: nil))
            if x > 0 && x + size.width > width { x = 0; y += row + rowSpacing; row = 0 }
            points.append(CGPoint(x: x, y: y)); x += size.width + spacing; row = max(row, size.height)
        }
        return (CGSize(width: width, height: y + row), points)
    }
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize { layout(proposal, subviews).0 }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let (_, points) = layout(.init(width: bounds.width, height: nil), subviews)
        for (i, view) in subviews.enumerated() { view.place(at: CGPoint(x: bounds.minX + points[i].x, y: bounds.minY + points[i].y), proposal: .init(width: min(bounds.width, view.sizeThatFits(.unspecified).width), height: nil)) }
    }
}
