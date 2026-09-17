import SwiftUI
import GlfansCore

/// ArchiveCalendar / CalendarWeek / CalendarFollowing. Only the sheet hosting,
/// keyboard avoidance and persisted preferences use iOS-specific behavior.
struct CalendarView: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var selected = Date()
    @State private var now = Date()
    @State private var expanded: String?
    @State private var managing = false
    @State private var choosing = false
    @State private var pickerYear = Calendar.current.component(.year, from: Date())
    @State private var query = ""
    @State private var notes = false
    @State private var weekDrag:CGFloat=0
    @State private var weekTouchDragged=false
    @State private var weekDragEndedAt:TimeInterval=0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private var calendar: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = app.timeZone; c.firstWeekday = 2; return c }
    private var days: [Date] { CalendarRules.week(containing: selected, zone: app.timeZone) }
    private var confirmedIDs: Set<String> { app.calendarIndex.confirmedSeriesIDs }
    private var noFollowing: Bool { confirmedIDs.isDisjoint(with: app.followed) }
    private func copy(_ key: String) -> String { app.calendarCopy(key) }
    private func title(_ id: String) -> String { app.catalog?.dramas.first(where: { $0.id == id }).map { app.t($0.title) } ?? app.t(app.schedule?.series.first(where: { $0.id == id })?.name ?? id) }
    private func date(_ value: String) -> Date? { let f = DateFormatter(); f.calendar = calendar; f.timeZone = app.timeZone; f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"; return f.date(from: value) }
    private func format(_ value: Date, _ pattern: String) -> String { let f = DateFormatter(); f.calendar = calendar; f.timeZone = app.timeZone; f.locale = app.systemLocale; f.dateFormat = pattern; return f.string(from: value) }
    private func episode(_ event: BroadcastEvent) -> String {
        guard let ep = event.episode else { return copy("premiere") }
        return app.locale == "zh" ? "第 \(ep) 集" : app.locale == "th" ? "ตอนที่ \(ep)" : String(format: "EP. %02d", ep)
    }
    private func time(_ event: BroadcastEvent) -> String { event.timestamp.map { format($0, "HH:mm") } ?? copy(event.status(now: now) == "已播出" ? "timeUnrecorded" : "timeUnknown") }
    private var availability: [String: [BroadcastEvent]] { app.calendarIndex.availableMonths(following: app.followingOnly ? app.followed : nil) }
    private var years: [Int] {
        Set((app.catalog?.years.compactMap(Int.init) ?? []) + (app.schedule?.events.compactMap { Int($0.date.prefix(4)) } ?? []) + [calendar.component(.year, from: now), calendar.component(.year, from: selected)]).sorted()
    }
    var body: some View {
        VStack(spacing: 0) {
            Rectangle().fill(Pit.pink).frame(height: 4)
            HStack(spacing: 16) {
                Text(copy("title")).sourceFont(20, weight: 800)
                Spacer()
                Button { dismiss() } label: { SourceIcon("X", size: 20).frame(width: 44, height: 44) }.accessibilityLabel(copy("close"))
            }.padding(.leading, 20).padding(.trailing, 16).padding(.top, 8).padding(.bottom, 4)
            VStack(spacing: 0) {
                Rectangle().fill(Pit.ink).frame(height: 2)
                HStack(spacing: 2) {
                    Button { moveMonth(-1) } label: { SourceIcon("CaretLeft", size: 20).frame(width: 44, height: 44) }.accessibilityLabel(copy("previous"))
                    Button { pickerYear = calendar.component(.year, from: selected); choosing.toggle(); managing = false } label: {
                        HStack(spacing: 3) { Text(format(selected, app.locale == "zh" ? "yyyy年M月" : "MMM yyyy")).sourceFont(18, weight: 700); SourceIcon("CaretDown", size: 12) }
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }.accessibilityLabel(copy("chooseMonth"))
                    Button { moveMonth(1) } label: { SourceIcon("CaretRight", size: 20).frame(width: 44, height: 44) }.accessibilityLabel(copy("next"))
                    Button { selected = now; choosing = false; expanded = nil } label: {
                        Text(copy("today")).sourceFont(12).padding(.horizontal, 8).frame(minWidth: 44, minHeight: 44)
                            .overlay(Rectangle().stroke(Color(white: 0.73), lineWidth: 1).padding(.vertical, 8))
                    }.padding(.leading, 8)
                }
                if app.locale == "en" { Text("Thailand time · UTC+7").sourceFont(10).frame(maxWidth: .infinity, alignment: .trailing).padding(.bottom, 2) }
                filters
            }.padding(.horizontal, 20)
            ScrollViewReader { scroll in
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        Color.clear.frame(height: 0).id("calendar-top")
                        if choosing { periodPicker }
                        else if managing { followingManager }
                        else if app.followingOnly && noFollowing {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(copy("noFollowing")).sourceFont(13).foregroundStyle(Color(white: 0.4))
                                Button { managing = true } label: { Text(copy("chooseSeries")).sourceFont(12).underline(color: Pit.pink).frame(minHeight: 44) }
                            }.padding(.vertical, 28)
                        } else { week }
                        provenance
                    }.padding(.horizontal, 20).padding(.bottom, 20)
                }.scrollIndicators(.hidden).scrollDismissesKeyboard(.interactively)
                    .onChange(of: choosing) { _, _ in scroll.scrollTo("calendar-top", anchor: .top) }
                    .onChange(of: managing) { _, _ in scroll.scrollTo("calendar-top", anchor: .top) }
            }
        }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top).background(Pit.paper).buttonStyle(SourceButtonStyle())
            .task { await app.refreshSchedule() }
            .task { while !Task.isCancelled { do { try await Task.sleep(for: .seconds(60)) } catch { return }; now = Date() } }
    }
    private var filters: some View {
        HStack(spacing: 8) {
            if !managing && !choosing {
                Text(format(days[0], "MMM d") + " — " + format(days[6], "MMM d")).sourceFont(11, weight: 600).fixedSize(horizontal: false, vertical: true).accessibilityIdentifier("calendar-week-range")
            }
            Spacer(minLength: 0)
            HStack(spacing: 8) { filter(false, "allSeries"); filter(true, "followingShort") }
            Button {
                choosing = false
                if managing { app.followingOnly = true }
                managing.toggle()
            } label: {
                HStack(spacing: 4) { SourceIcon(managing ? "Check" : "SlidersHorizontal", size: 14); Text(copy(managing ? "done" : "chooseShort")).sourceFont(11) }
                    .padding(.leading, 8).frame(minWidth: 44, minHeight: 44)
            }.padding(.leading, 8)
                .overlay(alignment: .leading) { Rectangle().fill(Color(white: 0.78)).frame(width: 1, height: 14).offset(x: -1) }
        }.overlay(alignment: .top) { Rectangle().fill(Color(red: 213/255, green: 213/255, blue: 206/255)).frame(height: 1) }
            .overlay(alignment: .bottom) { Rectangle().fill(Color(red: 213/255, green: 213/255, blue: 206/255)).frame(height: 1) }
    }
    private func filter(_ followed: Bool, _ key: String) -> some View {
        Button { app.followingOnly = followed; expanded = nil } label: {
            Text(copy(key)).sourceFont(11, weight: app.followingOnly == followed ? 700 : 400)
                .foregroundStyle(app.followingOnly == followed ? Pit.ink : Color(white: 0.4))
                .padding(.horizontal, 8).frame(minWidth: 44, minHeight: 44)
                .overlay(alignment: .bottom) { if app.followingOnly == followed { Rectangle().fill(Pit.pink).frame(height: 2).padding(.horizontal, 8).padding(.bottom, 7) } }
        }.accessibilityLabel(copy(followed ? "followingOnly" : "allSeries")).accessibilityAddTraits(app.followingOnly == followed ? .isSelected : [])
    }
    private var week:some View {
        weekRows(days).offset(x:weekDrag)
            .overlay(alignment:.topLeading) {
                GeometryReader {g in
                    if weekDrag != 0 {
                        let step=weekDrag<0 ? 7:-7
                        let adjacent=calendar.date(byAdding:.day,value:step,to:selected)!
                        weekRows(CalendarRules.week(containing:adjacent,zone:app.timeZone))
                            .frame(width:g.size.width).offset(x:weekDrag+(step>0 ? g.size.width:-g.size.width))
                            .allowsHitTesting(false).accessibilityHidden(true)
                    }
                }.allowsHitTesting(false)
            }.clipped().contentShape(Rectangle())
            .background(CalendarWeekPan(onTouchStart: { weekTouchDragged=false }, onChange: {translation in
                weekTouchDragged=true; weekDrag=translation
            }, onEnd: {translation in
                weekDragEndedAt=ProcessInfo.processInfo.systemUptime
                if abs(translation)>60 {
                    selected=calendar.date(byAdding:.day,value:translation<0 ? 7:-7,to:selected)!;expanded=nil;weekDrag=0
                } else {withAnimation(reduceMotion ? nil:.easeOut(duration:0.18)) {weekDrag=0}}
            }))
            .accessibilityElement(children:.contain).accessibilityLabel(copy("weekView")).accessibilityIdentifier("calendar-week")
            .accessibilityAction(named:copy("swipeWeek")) {selected=calendar.date(byAdding:.day,value:7,to:selected)!;expanded=nil}
    }
    private func weekRows(_ weekDays:[Date])->some View {
        VStack(spacing: 0) {
            ForEach(Array(weekDays.enumerated()), id: \.offset) { index, day in
                let today = calendar.isDate(day, inSameDayAs: now)
                let entries = app.calendarIndex.events(on: CalendarRules.day(day, zone: app.timeZone), following: app.followingOnly ? app.followed : nil)
                HStack(alignment: .top, spacing: 10) {
                    VStack(spacing: 3) {
                        Text(copy("weekday\(index)")).sourceFont(11).foregroundStyle(today ? Color(red: 183/255, green: 47/255, blue: 114/255) : Color(white: 0.4))
                        Text(format(day, "d")).sourceFont(20, weight: 700).frame(width: 30, height: 30)
                            .foregroundStyle(today ? .white : Pit.ink).background { if today { Circle().fill(Pit.ink) } }
                    }.frame(width: 42).padding(.top, 3)
                    VStack(spacing: 7) {
                        if entries.isEmpty { Text(copy(app.followingOnly ? "noFollowingEntries" : "noEntries")).sourceFont(12).foregroundStyle(Color(white: 0.53)).padding(.horizontal, 11).padding(.vertical, 13).frame(maxWidth: .infinity, alignment: .leading) }
                        ForEach(entries) { event in entry(event, today: today, day: day) }
                    }
                }.padding(.vertical, 10).frame(minHeight: 64, alignment: .top)
                    .overlay(alignment: .top) { if index != 0 { Rectangle().fill(Color(red: 213/255, green: 213/255, blue: 206/255)).frame(height: 1) } }
            }
        }
    }
    private func entry(_ event: BroadcastEvent, today: Bool, day: Date) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                guard weekDrag == 0 && !(weekTouchDragged && ProcessInfo.processInfo.systemUptime-weekDragEndedAt < 0.15) else { return }
                selected = day; expanded = expanded == event.id ? nil : event.id
            } label: {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(title(event.seriesId)).sourceFont(13, weight: 600).lineSpacing(3).fixedSize(horizontal: false, vertical: true).frame(maxWidth: .infinity, alignment: .leading)
                        SourceIcon("CaretDown", size: 15).rotationEffect(.degrees(expanded == event.id ? 180 : 0))
                    }
                    HStack(alignment: .firstTextBaseline, spacing: 14) {
                        Text(episode(event)).sourceFont(11, weight: 600)
                        Text(time(event)).sourceFont(11).foregroundStyle(Color(white: 0.33))
                    }
                }.padding(.horizontal, 11).padding(.vertical, 9).frame(maxWidth: .infinity, minHeight: 60, alignment: .leading)
                    .background(today ? Pit.pink : .white)
            }.accessibilityIdentifier("calendar-event-\(event.id)")
            if expanded == event.id { details(event).accessibilityElement(children:.contain).accessibilityIdentifier("calendar-detail-\(event.id)").padding(.horizontal, 11).padding(.top, 12).padding(.bottom, 6) }
        }.padding(.leading, 2).background(.white)
            .overlay(alignment: .leading) { Rectangle().fill(Pit.pink).frame(width: 2) }
    }
    private func details(_ event: BroadcastEvent) -> some View {
        let drama = app.catalog?.dramas.first { $0.id == event.seriesId }
        let series = app.schedule?.series.first { $0.id == event.seriesId }
        return VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 12) {
                if let drama { LocalArtwork(source: drama.image).frame(width: 72).frame(maxHeight: 108) }
                VStack(alignment: .leading, spacing: 8) {
                    Text(copy(event.status(now: now) == "已播出" ? "aired" : event.status(now: now) == "今日播出" ? "airingToday" : "upcoming")).sourceFont(10).foregroundStyle(Color(white: 0.4))
                    if let network = event.network ?? series?.network { Text(copy("network") + " · " + network).sourceFont(11) }
                    if let series, !series.platforms.isEmpty { Text(copy("availability") + " · " + series.platforms.joined(separator: " / ")).sourceFont(11) }
                }
            }.padding(.top, 6)
            if let drama { Text(app.t(drama.summary)).sourceFont(13).lineSpacing(5).fixedSize(horizontal: false, vertical: true) }
            if let url = URL(string: event.sourceUrl) { Link(destination: url) { HStack(spacing: 4) { Text(copy("more")).underline(); SourceIcon("ArrowUpRight", size: 14) }.sourceFont(11).frame(minHeight: 44) } }
        }.foregroundStyle(Color(white: 0.13))
    }
    private var followingManager: some View {
        let series: [ScheduledSeries] = (app.schedule?.series ?? []).filter(matches)
        let groups: [String: [ScheduledSeries]] = Dictionary(grouping: series, by: seriesYear)
        return VStack(alignment: .leading, spacing: 0) {
            Text(copy("followHint")).sourceFont(12).foregroundStyle(Color(white: 0.4)).padding(.vertical, 12)
            TextField(copy("searchSeries"), text: $query).sourceFont(16).padding(12).frame(minHeight: 44).background(.white).overlay(Rectangle().stroke(Color(white: 0.73), lineWidth: 1)).padding(.bottom, 18)
                .autocorrectionDisabled().textInputAutocapitalization(.never).accessibilityIdentifier("calendar-search")
            if series.isEmpty { Text(copy("noSearchResults")).sourceFont(12).padding(.vertical, 12) }
            ForEach(groups.keys.sorted(by: >), id: \.self) { year in
                Text(year).sourceFont(16, weight: 700).padding(.bottom, 8)
                VStack(spacing: 8) {
                    ForEach(groups[year] ?? []) { item in
                        Button { app.toggleFollow(item.id) } label: {
                            HStack(spacing: 10) {
                                ZStack { Rectangle().fill(app.followed.contains(item.id) ? Pit.ink : .white); if app.followed.contains(item.id) { SourceIcon("Check", weight: "bold", size: 14).foregroundStyle(.white) } }
                                    .frame(width: 17, height: 17).overlay(Rectangle().stroke(Pit.ink, lineWidth: 1))
                                if let drama = app.catalog?.dramas.first(where: { $0.id == item.id }) { SourcePhoto(source: drama.image).frame(width: 32, height: 44) }
                                Text(title(item.id)).sourceFont(13).fixedSize(horizontal: false, vertical: true).frame(maxWidth: .infinity, alignment: .leading)
                            }.padding(.horizontal, 10).padding(.vertical, 9).frame(minHeight: 62).background(.white)
                                .overlay(alignment: .leading) { if app.followed.contains(item.id) { Rectangle().fill(Pit.pink).frame(width: 2) } }
                        }.accessibilityAddTraits(app.followed.contains(item.id) ? .isSelected : [])
                    }
                }.padding(.bottom, 20)
            }
        }.padding(.top, 4).padding(.bottom, 12)
    }
    private func seriesYear(_ item: ScheduledSeries) -> String {
        if let drama = app.catalog?.dramas.first(where: { $0.id == item.id }) { return drama.year }
        return String((item.premiereDate ?? "").prefix(4))
    }
    private func matches(_ item: ScheduledSeries) -> Bool {
        guard confirmedIDs.contains(item.id) else { return false }
        if query.trimmingCharacters(in: .whitespaces).isEmpty { return true }
        let drama = app.catalog?.dramas.first { $0.id == item.id }
        var fields: [String] = [title(item.id), item.name, seriesYear(item)]
        fields.append(drama?.title ?? ""); fields.append(drama?.titleEn ?? "")
        fields.append(drama?.cast.joined(separator: " ") ?? "")
        return fields.joined(separator: " ").localizedCaseInsensitiveContains(query)
    }
    private var periodPicker: some View {
        let availability = availability
        return VStack(spacing: 16) {
            SourceFlow {
                ForEach(years, id: \.self) { year in
                    Button { pickerYear = year } label: { Text(String(year)).sourceFont(14).padding(.horizontal, 14).frame(minHeight: 44).background(pickerYear == year ? Pit.ink : .white).foregroundStyle(pickerYear == year ? .white : Pit.ink) }
                        .disabled(!availability.keys.contains(where: { $0.hasPrefix(String(year) + "-") }))
                        .opacity(availability.keys.contains(where: { $0.hasPrefix(String(year) + "-") }) ? 1 : 0.4)
                }
            }.padding(.bottom, 16).overlay(alignment: .bottom) { Rectangle().fill(Color(white: 0.83)).frame(height: 1) }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
                ForEach(1...12, id: \.self) { month in
                    let key = String(format: "%04d-%02d", pickerYear, month)
                    let entries = availability[key] ?? []
                    let count = Set(entries.map(\.seriesId)).count
                    let active = format(selected, "yyyy-MM") == key
                    Button {
                        if let first = entries.map({ $0.day(in: app.timeZone) }).sorted().first, let date = date(first) { selected = date; choosing = false; expanded = nil }
                    } label: {
                        VStack(spacing: 4) {
                            Text(date(key + "-01").map { format($0, "MMMM") } ?? String(month)).sourceFont(14)
                            if count > 0 { Text(count == 1 && app.locale == "en" ? copy("monthSeriesSingle") : copy("monthSeriesCount").replacingOccurrences(of: "{count}", with: String(count))).sourceFont(11).opacity(0.75) }
                        }.frame(maxWidth: .infinity, minHeight: 64).background(entries.isEmpty ? .clear : active ? Pit.ink : .white)
                            .foregroundStyle(entries.isEmpty ? Color(white: 0.6) : active ? .white : Pit.ink)
                            .overlay(Rectangle().stroke(entries.isEmpty ? Color(white: 0.9) : active ? Pit.ink : Color(white: 0.87), lineWidth: 1))
                    }.disabled(entries.isEmpty)
                }
            }
        }.padding(.top, 16).padding(.bottom, 24)
    }
    private var provenance: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button { notes.toggle() } label: { HStack(spacing: 5) { SourceIcon("CaretRight", size: 12).rotationEffect(.degrees(notes ? 90 : 0)); Text(copy("notes")).sourceFont(12) }.frame(minHeight: 44) }
            if notes {
                Text(copy("notice")).sourceFont(11).lineSpacing(4)
                HStack(spacing: 16) {
                    Link(copy("sourceName"), destination: URL(string: "https://glspotlight.com/airing")!)
                    Link("TVmaze", destination: URL(string: "https://www.tvmaze.com")!)
                }.sourceFont(11)
                if let checked = app.schedule?.checkedAt, let date = CalendarRules.timestamp(checked) {
                    Text(copy("checked") + "：" + format(date, "yyyy MMM d HH:mm")).sourceFont(11)
                    if now.timeIntervalSince(date) > 8 * 86400 { Text(copy("stale")).sourceFont(11, weight: 700).foregroundStyle(Color(red: 169/255, green: 37/255, blue: 97/255)) }
                }
                if let checked = app.schedule?.historyCheckedAt, let date = CalendarRules.timestamp(checked) { Text(copy("historyChecked") + "：" + format(date, "yyyy MMM d")).sourceFont(11) }
                if let error = app.scheduleError { Text(app.t(error)).sourceFont(11); Button(app.t("重试")) { Task { await app.refreshSchedule(force: true) } }.frame(minHeight: 44) }
            }
        }.foregroundStyle(Color(white: 0.4)).padding(.vertical, 8)
    }
    private func moveMonth(_ delta: Int) {
        let start = calendar.date(from: calendar.dateComponents([.year, .month], from: selected))!
        selected = calendar.date(byAdding: .month, value: delta, to: start)!; choosing = false; expanded = nil
    }
}

/// Recognize horizontal intent before cancelling a row's tap. The recognizer
/// lives on the native scrolling view, so moving the week's visual content does
/// not replace/cancel its gesture midway through a drag (iOS 17 and later).
private struct CalendarWeekPan: UIViewRepresentable {
    let onTouchStart: () -> Void
    let onChange: (CGFloat) -> Void
    let onEnd: (CGFloat) -> Void
    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }
    func makeUIView(context: Context) -> Anchor {
        let view = Anchor()
        view.isUserInteractionEnabled = false
        view.attached = { [weak coordinator = context.coordinator] anchor in coordinator?.attach(anchor) }
        return view
    }
    func updateUIView(_ view: Anchor, context: Context) {
        context.coordinator.parent = self
        context.coordinator.attach(view)
    }
    static func dismantleUIView(_ view: Anchor, coordinator: Coordinator) { coordinator.detach() }
    final class Anchor: UIView {
        var attached: ((Anchor) -> Void)?
        override func didMoveToWindow() { super.didMoveToWindow(); attached?(self) }
    }
    final class Coordinator: NSObject, UIGestureRecognizerDelegate {
        var parent: CalendarWeekPan
        weak var anchor: Anchor?
        weak var scroll: UIScrollView?
        lazy var pan: UIPanGestureRecognizer = {
            let gesture = UIPanGestureRecognizer(target: self, action: #selector(handle(_:)))
            gesture.delegate = self; gesture.maximumNumberOfTouches = 1
            gesture.cancelsTouchesInView = true
            return gesture
        }()
        init(parent: CalendarWeekPan) { self.parent = parent }
        func attach(_ anchor: Anchor) {
            self.anchor = anchor
            var candidate = anchor.superview
            while let view = candidate {
                if let scroll = view as? UIScrollView {
                    guard self.scroll !== scroll else { return }
                    detach(); self.scroll = scroll; scroll.addGestureRecognizer(pan); return
                }
                candidate = view.superview
            }
        }
        func detach() { scroll?.removeGestureRecognizer(pan); scroll = nil }
        func gestureRecognizerShouldBegin(_ gesture: UIGestureRecognizer) -> Bool {
            let velocity = pan.velocity(in: scroll)
            return abs(velocity.x) > abs(velocity.y) * 1.5
        }
        func gestureRecognizer(_ gesture: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
            guard let anchor else { return false }
            let inside = anchor.bounds.contains(touch.location(in: anchor))
            if inside { parent.onTouchStart() }
            return inside
        }
        func gestureRecognizer(_ gesture: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool { other === scroll?.panGestureRecognizer }
        @objc func handle(_ gesture: UIPanGestureRecognizer) {
            let translation = gesture.translation(in: scroll).x
            switch gesture.state {
            case .began, .changed: parent.onChange(translation)
            case .ended: parent.onEnd(translation)
            case .cancelled, .failed: parent.onEnd(0)
            default: break
            }
        }
    }
}
