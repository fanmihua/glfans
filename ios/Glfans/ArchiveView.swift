import SwiftUI
import GlfansCore

struct ArchiveView: View {
    @EnvironmentObject var app: AppModel
    let catalog: Catalog
    @State private var year: String?
    @State private var activeOverviewYear: String? = "2024"
    @State private var selected: String?
    @State private var calendarOpen = false
    @State private var query = ""
    var dramas: [Drama] {
        catalog.dramas.filter { ($0.year == year || !query.isEmpty) && (query.isEmpty || $0.title.localizedCaseInsensitiveContains(query) || $0.titleEn.localizedCaseInsensitiveContains(query) || $0.cast.joined().localizedCaseInsensitiveContains(query)) }
    }
    var body: some View {
        Group {
            if year == nil {
                ArchiveOverview(
                    catalog: catalog,
                    activeYear: $activeOverviewYear,
                    openCalendar: { calendarOpen = true },
                    openYear: { value in
                        year = value
                        selected = catalog.dramas(in: value).first?.id
                    }
                )
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                    HStack {
                        Button { year = nil; query = "" } label: { Label(app.t("返回"), systemImage: "arrow.left").frame(minHeight: 44) }
                        Spacer()
                        if query.isEmpty {
                            Menu(year ?? "") { ForEach(catalog.years, id: \.self) { value in Button(value) { year = value; selected = catalog.dramas(in: value).first?.id } } }.font(.title2.bold())
                        }
                    }
                    if dramas.isEmpty { ContentUnavailableView.search(text: query) }
                    ScrollView(.horizontal) {
                        LazyHStack(spacing: 18) {
                            ForEach(dramas) { drama in
                                Button { withAnimation { selected = drama.id } } label: {
                                    VStack(alignment: .leading, spacing: 10) {
                                        HStack { ForEach(0..<7) { _ in RoundedRectangle(cornerRadius: 2).fill(Pit.paper).frame(width: 15, height: 7) } }
                                        LocalArtwork(source: drama.image, mode: .fill).frame(width: 210, height: 280).clipped().saturation(selected == drama.id ? 1 : 0)
                                        Text(app.t(drama.title)).font(.headline).foregroundStyle(selected == drama.id ? Pit.pink : .white).fixedSize(horizontal: false, vertical: true)
                                        Text(drama.startDate).font(.caption.monospaced()).foregroundStyle(.white.opacity(0.65))
                                    }.padding(14).frame(width: 238).background(Pit.ink)
                                }.buttonStyle(.plain).id(drama.id)
                            }
                        }.scrollTargetLayout()
                    }.scrollIndicators(.hidden).scrollTargetBehavior(.viewAligned).scrollPosition(id: $selected, anchor: .center)
                    if let drama = dramas.first(where: { $0.id == selected }) ?? dramas.first { DramaDetails(drama: drama) }
                    }.padding(20).padding(.bottom, 96)
                }
                .background(Pit.paper)
            }
        }
        .background(Pit.paper).navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $calendarOpen) { NavigationStack { CalendarView() } }
        .sheet(item: $app.selectedDrama) { drama in NavigationStack { ScrollView { DramaDetails(drama: drama).padding(24) }.background(Pit.paper).navigationTitle(app.t(drama.title)).toolbar { ToolbarItem(placement: .confirmationAction) { Button(app.t("完成")) { app.selectedDrama = nil } } } } }
    }
}

/// Source conversion of `ArchiveOverview` in `src/ArchivePage.jsx` and its
/// `@media (max-width: 760px)` rules in `src/archive-page.css`.
private struct ArchiveOverview: View {
    @EnvironmentObject private var app: AppModel
    let catalog: Catalog
    @Binding var activeYear: String?
    let openCalendar: () -> Void
    let openYear: (String) -> Void

    private var years: [String] { catalog.years.sorted() }
    private var activeIndex: Int { years.firstIndex(of: activeYear ?? "2024") ?? 2 }

    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 0) {
                hero(width: geometry.size.width)
                    .frame(height: 278)

                Spacer(minLength: 0)

                HStack(alignment: .lastTextBaseline) {
                    Text(app.t("按年份归档"))
                        .font(PitFont.interface(11, locale: app.locale).weight(.bold))
                        .padding(.bottom, 4)
                        .overlay(alignment: .bottom) { Rectangle().fill(Pit.pink).frame(height: 2) }
                    Spacer()
                    Text(activeYear ?? "2024")
                        .font(PitFont.display(13).weight(.bold))
                        .foregroundStyle(Pit.pink)
                    Text(String(format: "%02d / %02d", activeIndex + 1, years.count))
                        .font(PitFont.display(8).weight(.bold))
                        .foregroundStyle(Pit.ink.opacity(0.58))
                }
                .padding(.horizontal, WebMobileDesign.ArchiveOverview.filmHeadingHorizontalInset)
                .padding(.bottom, WebMobileDesign.ArchiveOverview.filmHeadingBottom)

                film(width: geometry.size.width)
            }
            .frame(maxHeight: .infinity, alignment: .top)
        }
        .background(Pit.paper)
    }

    private func hero(width: CGFloat) -> some View {
        ZStack(alignment: .top) {
            Text("ARCHIVE")
                .font(PitFont.display(width * 0.27).weight(.bold))
                .tracking(-5)
                .foregroundStyle(Pit.ink.opacity(0.035))
                .offset(y: 30)

            LocalArtwork(source: "assets/home/freenbecky-card-v1.webp", mode: .fit)
                .frame(width: 138)
                .rotationEffect(.degrees(-5))
                .opacity(0.82)
                .offset(x: -width / 2 + 18, y: 12)
                .accessibilityHidden(true)
            LocalArtwork(source: "assets/home/lingorm-card-v1.webp", mode: .fit)
                .frame(width: 116)
                .rotationEffect(.degrees(5))
                .opacity(0.82)
                .offset(x: width / 2 - 24, y: 15)
                .accessibilityHidden(true)

            VStack(spacing: 0) {
                Spacer().frame(height: 70)
                chineseTitle
                ZStack(alignment: .bottom) {
                    LocalArtwork(source: "assets/repo-collection-pink-brush-v1.webp", mode: .fill)
                        .frame(width: 224, height: 22)
                        .clipped()
                        .offset(y: 7)
                    Text(app.t("PIT ARCHIVE"))
                        .font(PitFont.headline(38).weight(.bold))
                        .tracking(1.2)
                        .foregroundStyle(Pit.pink)
                        .lineLimit(1)
                        .minimumScaleFactor(0.65)
                }
                .rotationEffect(.degrees(-1.8))

                Button(action: openCalendar) {
                    HStack(spacing: 8) {
                        Image(systemName: "calendar")
                        Text(app.t("查看播出日历"))
                        Image(systemName: "arrow.right")
                            .foregroundStyle(Pit.pink)
                    }
                    .font(PitFont.interface(11, locale: app.locale).weight(.bold))
                    .padding(.horizontal, 16)
                    .frame(height: 44)
                    .background(Pit.ink)
                    .foregroundStyle(.white)
                }
                .buttonStyle(.plain)
                .rotationEffect(.degrees(-1.4))
                .padding(.top, 14)
            }

            LocalArtwork(source: "assets/about/annotation-loop-arrow-v1.webp")
                .frame(width: 31, height: 55)
                .rotationEffect(.degrees(-30))
                .offset(x: -width * 0.39, y: 154)
                .accessibilityHidden(true)
            LocalArtwork(source: "assets/about/annotation-loop-arrow-v1.webp")
                .frame(width: 28, height: 50)
                .rotationEffect(.degrees(158))
                .offset(x: width * 0.38, y: 120)
                .accessibilityHidden(true)
            LocalArtwork(source: "assets/repo-handdrawn-heart-pink.webp")
                .frame(width: 22, height: 22)
                .offset(x: width * 0.39, y: 208)
                .accessibilityHidden(true)
        }
        .clipped()
    }

    @ViewBuilder private var chineseTitle: some View {
        if app.locale == "zh" {
            HStack(alignment: .bottom, spacing: -6) {
                ForEach(Array("考古档案".enumerated()), id: \.offset) { index, character in
                    Text(String(character))
                        .font(PitFont.hero([61, 68, 63, 69][index]))
                        .rotationEffect(.degrees([-3, 1, -1.5, 2][index]))
                        .offset(y: [-1, 2, -2, 1][index])
                }
            }
        } else {
            Text(app.t("考古档案"))
                .font(PitFont.interface(54, locale: app.locale).weight(.black))
                .minimumScaleFactor(0.55)
                .lineLimit(2)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 28)
        }
    }

    private func film(width: CGFloat) -> some View {
        let cardWidth = min(
            WebMobileDesign.ArchiveOverview.filmWidthMax,
            max(WebMobileDesign.ArchiveOverview.filmWidthMin, width * WebMobileDesign.ArchiveOverview.filmWidthRatio)
        )
        let cardHeight = cardWidth * 4 / 3
        return ZStack {
            Pit.ink
            VStack {
                perforations(width: width)
                Spacer()
                perforations(width: width)
            }
            .padding(.vertical, 7)

            ScrollView(.horizontal) {
                LazyHStack(spacing: WebMobileDesign.ArchiveOverview.filmGap) {
                    ForEach(years, id: \.self) { value in
                        Button {
                            activeYear = value
                            openYear(value)
                        } label: {
                            yearFrame(value, active: activeYear == value)
                                .frame(width: cardWidth, height: cardHeight)
                        }
                        .buttonStyle(.plain)
                        .id(value)
                    }
                }
                .scrollTargetLayout()
                .padding(.horizontal, max(0, (width - cardWidth) / 2))
            }
            .scrollIndicators(.hidden)
            .scrollTargetBehavior(.viewAligned(limitBehavior: .always))
            .scrollPosition(id: $activeYear, anchor: .center)
        }
        .frame(height: cardHeight + 44)
    }

    private func perforations(width: CGFloat) -> some View {
        HStack(spacing: 32) {
            ForEach(0..<10, id: \.self) { _ in Rectangle().fill(Pit.paper).frame(width: 15, height: 7) }
        }
        .frame(width: width, alignment: .leading)
        .clipped()
    }

    private func yearFrame(_ value: String, active: Bool) -> some View {
        let dramas = catalog.dramas(in: value)
        let representative = dramas.first(where: { $0.id == catalog.archiveRepresentativeIds[value] }) ?? dramas.first
        return ZStack(alignment: .topLeading) {
            if let representative {
                LocalArtwork(source: representative.image, mode: .fill)
                    .saturation(active ? 0.9 : 0)
                    .contrast(active ? 1.03 : 1.12)
                    .scaleEffect(active ? 1.035 : 1)
            }
            GeometryReader { geometry in
                LinearGradient(
                    colors: [Pit.ink.opacity(0.92), Pit.ink.opacity(0.66), .clear],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .frame(width: geometry.size.width * WebMobileDesign.ArchiveOverview.yearStampWidthRatio)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("ARCHIVE YEAR")
                    .font(PitFont.display(7).weight(.bold))
                    .tracking(1)
                    .foregroundStyle(active ? Pit.pink : .white.opacity(0.72))
                Text(value)
                    .font(PitFont.hero(48))
                    .tracking(-3)
                    .foregroundStyle(.white)
                Text("\(dramas.count) " + app.t("部剧集"))
                    .font(PitFont.display(8).weight(.bold))
                    .foregroundStyle(active ? Pit.pink : .white.opacity(0.72))
            }
            .padding(.horizontal, WebMobileDesign.ArchiveOverview.yearStampHorizontal)
            .padding(.top, WebMobileDesign.ArchiveOverview.yearStampTop)
            .padding(.bottom, WebMobileDesign.ArchiveOverview.yearStampBottom)
        }
        .clipped()
        .overlay(Rectangle().stroke(active ? Pit.pink : .white.opacity(0.45), lineWidth: active ? 3 : 1))
    }
}

struct DramaDetails: View {
    @EnvironmentObject var app: AppModel
    let drama: Drama
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(app.t(drama.title)).font(.title.bold()).foregroundStyle(Pit.pink).fixedSize(horizontal: false, vertical: true)
            Text(drama.titleEn).font(.subheadline.weight(.semibold))
            HStack { Text(app.t(drama.status)); Spacer(); Text(drama.startDate) }.font(.caption).foregroundStyle(.secondary)
            Divider()
            Text(app.t(drama.summary)).font(.body).lineSpacing(6).textSelection(.enabled)
            if !drama.cast.isEmpty { Text(drama.cast.joined(separator: "\n")).font(.subheadline).lineSpacing(6) }
            Text(([drama.company] + drama.platforms).joined(separator: " · ")).font(.caption).foregroundStyle(.secondary)
            if let url = URL(string: drama.sourceUrl), url.scheme == "https" { Link(destination: url) { Label(app.t("来源"), systemImage: "arrow.up.right") }.frame(minHeight: 44) }
        }.padding(20).frame(maxWidth: .infinity, alignment: .leading).background(.white)
    }
}

struct CalendarView: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.dismiss) var dismiss
    @State private var date = Date()
    @State private var selecting = false
    @State private var periodPicker = false
    @State private var expanded: String?
    @State private var now = Date()
    private let clock = Timer.publish(every: 60, on: .main, in: .common).autoconnect()
    var calendar: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = app.timeZone; return c }
    var events: [BroadcastEvent] { (app.schedule?.confirmed ?? []).filter { !app.followingOnly || app.followed.contains($0.seriesId) } }
    var week: [Date] { CalendarRules.week(containing: date, zone: app.timeZone) }
    func dateLabel(_ date: Date, format: String) -> String { let f = DateFormatter(); f.locale = app.systemLocale; f.calendar = calendar; f.timeZone = app.timeZone; f.dateFormat = format; return f.string(from: date) }
    var month: String { dateLabel(date, format: "yyyy · MM") }
    var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: 10) {
                HStack {
                    Button { moveMonth(-1) } label: { Image(systemName: "chevron.left").frame(width: 44, height: 44) }.accessibilityLabel(app.t("上个月"))
                    Spacer()
                    Button { periodPicker = true } label: { Text(month).font(.title3.bold()); Image(systemName: "chevron.down").font(.caption) }
                    Spacer()
                    Button { moveMonth(1) } label: { Image(systemName: "chevron.right").frame(width: 44, height: 44) }.accessibilityLabel(app.t("下个月"))
                }
                HStack(spacing: 12) {
                    Text(dateLabel(week.first!, format: "M/d") + " – " + dateLabel(week.last!, format: "M/d")).font(.caption).lineLimit(1)
                    Spacer(minLength: 0)
                    Button(app.t("全部")) { app.followingOnly = false }.foregroundStyle(app.followingOnly ? Pit.ink : Pit.pink)
                    Button(app.t("关注")) { app.followingOnly = true }.foregroundStyle(app.followingOnly ? Pit.pink : Pit.ink)
                    Divider().frame(height: 14)
                    Button(app.t("选剧")) { selecting = true }
                }.font(.subheadline.bold()).frame(minHeight: 44)
            }.padding(.horizontal, 16).background(Pit.paper)
            Divider()
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    if app.followingOnly && app.followed.isEmpty { Text(app.t("还没有关注的剧集")).padding(20).foregroundStyle(.secondary) }
                    ForEach(week, id: \.self) { day in
                        let key = CalendarRules.day(day, zone: app.timeZone)
                        let daily = events.filter { $0.day(in: app.timeZone) == key }
                        HStack(alignment: .top, spacing: 12) {
                            VStack(spacing: 4) {
                                Text(dateLabel(day, format: "EEE")).font(.caption2)
                                Text(String(calendar.component(.day, from: day))).font(.headline).frame(width: 32, height: 32)
                                    .background(calendar.isDateInToday(day) ? Pit.ink : .clear).foregroundStyle(calendar.isDateInToday(day) ? .white : Pit.ink).clipShape(Circle())
                            }.frame(width: 44).padding(.top, 8)
                            VStack(spacing: 10) {
                                if daily.isEmpty { Text(app.t("暂无排期")).font(.caption).foregroundStyle(.secondary).frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 14) }
                                ForEach(daily) { event in eventRow(event) }
                            }
                        }.padding(.vertical, 10)
                        Divider()
                    }
                    DisclosureGroup(app.t("来源与说明")) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(app.locale == "zh" ? "北京时间 · UTC+8" : "Thailand time · UTC+7")
                            Text((app.schedule?.checkedAt ?? "").prefix(10)).font(.caption.monospaced())
                            Text(app.t("时间待公布")).font(.caption)
                            Text("GL Spotlight · TVmaze").font(.caption)
                            if let error = app.scheduleError { Text(app.t(error)).font(.caption).foregroundStyle(.secondary) }
                            Button(app.t(app.refreshingSchedule ? "更新中…" : "更新排期")) { Task { await app.refreshSchedule(force: true) } }.disabled(app.refreshingSchedule).frame(minHeight: 44)
                        }.frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 8)
                    }.font(.footnote).padding(.vertical, 20)
                }.padding(.horizontal, 16)
            }.simultaneousGesture(DragGesture(minimumDistance: 40).onEnded { gesture in
                if abs(gesture.translation.width) > abs(gesture.translation.height) * 1.5 { moveWeek(gesture.translation.width < 0 ? 1 : -1) }
            })
            HStack {
                Button { moveWeek(-1) } label: { Label(app.t("上周"), systemImage: "chevron.left").frame(minHeight: 44) }
                Spacer()
                Button(app.t("今天")) { date = Date(); expanded = nil }.frame(minHeight: 44)
                Spacer()
                Button { moveWeek(1) } label: { Label(app.t("下周"), systemImage: "chevron.right").frame(minHeight: 44) }
            }.font(.subheadline).padding(.horizontal, 20).background(Pit.paper)
        }.background(Pit.paper).navigationTitle(app.t("播出日历")).navigationBarTitleDisplayMode(.inline)
        .task { await app.refreshSchedule() }
        .onReceive(clock) { now = $0 }
        .toolbar { ToolbarItem(placement: .confirmationAction) { Button(app.t("完成")) { dismiss() } } }
        .sheet(isPresented: $selecting) { followingSheet }
        .sheet(isPresented: $periodPicker) {
            NavigationStack {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: 14) {
                        ForEach(Array(Set(events.map { String($0.day(in: app.timeZone).prefix(7)) })).sorted().reversed(), id: \.self) { month in
                            Button(month) { let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.timeZone = app.timeZone; if let value = f.date(from: month + "-01") { date = value; expanded = nil }; periodPicker = false }.pitButton()
                        }
                    }.padding(20)
                }.background(Pit.paper).navigationTitle(app.t("选择月份")).toolbar { ToolbarItem(placement: .confirmationAction) { Button(app.t("完成")) { periodPicker = false } } }
            }.presentationDetents([.medium, .large])
        }
    }
    func moveMonth(_ value: Int) { let first = calendar.date(from: calendar.dateComponents([.year, .month], from: date))!; date = calendar.date(byAdding: .month, value: value, to: first)!; expanded = nil }
    func moveWeek(_ value: Int) { date = calendar.date(byAdding: .day, value: value * 7, to: date)!; expanded = nil }
    func name(_ id: String) -> String { app.catalog?.dramas.first(where: { $0.id == id }).map { app.t($0.title) } ?? app.schedule?.series.first(where: { $0.id == id })?.name ?? id }
    @ViewBuilder func eventRow(_ event: BroadcastEvent) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Button { withAnimation { expanded = expanded == event.id ? nil : event.id } } label: {
                VStack(alignment: .leading, spacing: 7) {
                    Text(name(event.seriesId)).font(.subheadline.bold()).fixedSize(horizontal: false, vertical: true)
                    HStack { Text(event.episode.map { "EP \($0)" } ?? app.t("首播")); Spacer(); Text(event.timestamp.map { timestamp in let f = DateFormatter(); f.timeZone = app.timeZone; f.dateFormat = "HH:mm"; return f.string(from: timestamp) } ?? app.t("时间待公布")) }
                        .font(.caption)
                }.padding(12).frame(maxWidth: .infinity, alignment: .leading).background(expanded == event.id ? Pit.pink : .white).foregroundStyle(Pit.ink)
            }.buttonStyle(.plain)
            if expanded == event.id {
                VStack(alignment: .leading, spacing: 12) {
                    Text(app.t(event.status(now: now))).font(.caption.bold())
                    if let drama = app.catalog?.dramas.first(where: { $0.id == event.seriesId }) {
                        LocalArtwork(source: drama.image).frame(maxHeight: 180)
                        Text(app.t(drama.summary)).font(.subheadline).lineSpacing(4)
                    }
                    if let series = app.schedule?.series.first(where: { $0.id == event.seriesId }) { Text(series.platforms.joined(separator: " · ")).font(.caption) }
                    if let url = URL(string: event.sourceUrl) { Link(app.t("来源"), destination: url).font(.caption).frame(minHeight: 44) }
                }.padding(12).frame(maxWidth: .infinity, alignment: .leading).background(.white)
            }
        }
    }
    var followingSheet: some View {
        NavigationStack {
            List {
                ForEach((app.schedule?.series ?? []).filter { series in app.schedule?.confirmed.contains(where: { $0.seriesId == series.id }) == true }) { series in
                    Button { app.toggleFollow(series.id) } label: {
                        HStack { Text(name(series.id)).foregroundStyle(Pit.ink); Spacer(); Image(systemName: app.followed.contains(series.id) ? "checkmark.circle.fill" : "circle") }.frame(minHeight: 32)
                    }
                }
            }.navigationTitle(app.t("选剧")).toolbar { ToolbarItem(placement: .confirmationAction) { Button(app.t("完成")) { app.followingOnly = true; selecting = false } } }
        }
    }
}
