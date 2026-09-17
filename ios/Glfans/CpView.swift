import SwiftUI
import GlfansCore

struct CpView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.sourceBottomInset) private var bottom
    @Environment(\.sourceViewport) private var viewport
    let catalog: Catalog
    let cpCatalog: CpCatalog
    @State private var directoryOpen = false
    @State private var calendarOpen = false
    @State private var expandedMedia: Set<String> = []
    @State private var expandedTimeline = false
    @State private var expandedNotice = false
    @State private var jumpAnchor: String?

    private var profile: CpProfile { cpCatalog.profile(app.selectedCpID)! }
    private func copy(_ section: CpCopySection, _ key: String, fallback: String) -> String {
        cpCatalog.copy(section, key, locale: app.locale) ?? fallback
    }

    var body: some View {
        ScrollViewReader { reader in
            ScrollView {
                LazyVStack(spacing: 0, pinnedViews: [.sectionHeaders]) {
                    masthead
                    stats
                    Section {
                        identity
                        timeline.id("timeline")
                        if let notice = profile.detail.notice { conclusion(notice).id("conclusion") }
                        works.id("works")
                        if let child = profile.detail.child { children(child).id("children") }
                        mediaSection("music")
                        mediaSection("video")
                        publicEntries
                        sources
                            .padding(.bottom, 96 + bottom)
                    } header: {
                        switcher
                    }
                }
            }
            .onChange(of: jumpAnchor) { _, anchor in
                guard let anchor else { return }
                withAnimation(.easeInOut(duration: 0.25)) { reader.scrollTo(anchor, anchor: .top) }
                jumpAnchor = nil
            }
            .onAppear {
                #if DEBUG
                if let anchor = MainTabs.argument("--cp-anchor") {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { reader.scrollTo(anchor, anchor: .top) }
                }
                #endif
            }
        }
        .padding(.top, 46)
        .scrollIndicators(.hidden)
        .background(Pit.paper)
        .fullScreenCover(isPresented: $directoryOpen) {
            CpDirectorySheet(catalog: cpCatalog, selected: $app.selectedCpID)
                .sourceSheet(height: min(viewport.height * 0.76, 650), keyboardFraction: 0.76)
        }
        .fullScreenCover(isPresented: $calendarOpen) { CalendarView().sourceSheet(fraction: 0.9) }
        .onChange(of: app.selectedCpID) { _, _ in
            expandedMedia.removeAll()
            expandedTimeline = false
            expandedNotice = false
        }
    }

    private var masthead: some View {
        HStack(alignment: .center, spacing: 16) {
            Text(copy(.ui, "title", fallback: "百家饭"))
                .sourceFont(app.locale == "zh" ? 60 : app.locale == "th" ? 48 : 40,
                            family: app.locale == "th" ? "NotoSansThai-Regular" : "AlibabaPuHuiTi-Heavy", weight: 900)
                .foregroundStyle(Pit.pink)
                .tracking(app.locale == "zh" ? -3.3 : 0)
                .lineLimit(1)
            Text("CP ARCHIVE")
                .sourceFont(9, family: "RobotoCondensed-Regular", weight: 750)
                .foregroundStyle(.white).tracking(0.9)
                .padding(.horizontal, 9).frame(height: 28)
                .background(Pit.ink)
                .rotationEffect(.degrees(-5))
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 18).padding(.top, 22).padding(.bottom, 18)
    }

    private var stats: some View {
        let active = cpCatalog.profiles.filter { $0.status == "active" }.count
        let ended = cpCatalog.profiles.filter { $0.status == "ended" }.count
        let pending = cpCatalog.profiles.filter { $0.status == "unverified" }.count
        return HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text("\(cpCatalog.profiles.count)").sourceFont(19, weight: 750).foregroundStyle(Color(red: 37/255, green: 36/255, blue: 33/255))
            Text(app.locale == "zh" ? "CP" : app.locale == "th" ? "คู่" : "CPs").sourceFont(12)
            Spacer(minLength: 2)
            inlineStat(String(active), copy(.status, "active", fallback: "合作中"), color: Color(red: 163/255, green: 19/255, blue: 88/255))
            inlineStat(String(ended), copy(.status, "ended", fallback: "已结束"), color: Pit.ink)
            inlineStat(String(pending), copy(.status, "unverified", fallback: "待核实"), color: Pit.ink)
        }
        .foregroundStyle(Color(red: 104/255, green: 104/255, blue: 99/255))
        .padding(.horizontal, 18).padding(.bottom, 12)
    }

    private func inlineStat(_ value: String, _ label: String, color: Color) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 3) {
            Text(value).sourceFont(12, weight: 750).foregroundStyle(color)
            Text(label).sourceFont(11).lineLimit(1).minimumScaleFactor(0.75)
        }
    }

    private var switcher: some View {
        Button { directoryOpen = true } label: {
            HStack(spacing: 12) {
                Text(profile.label).sourceFont(17, family: "RobotoCondensed-Regular", weight: 800).foregroundStyle(Color(red: 163/255, green: 19/255, blue: 88/255))
                Spacer()
                Text(copy(.ui, "switchCp", fallback: "切换 CP")).sourceFont(12)
                SourceIcon("CaretDown", size: 18)
            }.padding(.horizontal, 12).frame(height: 48).contentShape(Rectangle())
        }
        .buttonStyle(SourceButtonStyle())
        .background(Color(red: 239/255, green: 237/255, blue: 232/255))
        .padding(.horizontal, 18).padding(.vertical, 8)
        .background(Pit.paper.opacity(0.98))
        .accessibilityIdentifier("cp-switcher")
    }

    private var identity: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let image = profile.detail.cp.image {
                LocalArtwork(source: image, mode: .fit)
                    .frame(maxWidth: 360, maxHeight: 330)
                    .frame(maxWidth: .infinity)
            }
            VStack(alignment: .leading, spacing: 0) {
                if profile.detail.notice != nil { statusTag }
                if profile.label != profile.names.joined() {
                    Text(profile.label).sourceFont(18, family: "Manrope-ExtraLight", weight: 800).foregroundStyle(Color(red: 163/255, green: 19/255, blue: 88/255)).padding(.bottom, 12)
                }
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(profile.names.first ?? "").foregroundStyle(Pit.ink)
                    Text(profile.names.dropFirst().first ?? "").foregroundStyle(Pit.pink)
                }
                .sourceFont(min(58, viewport.width * 0.135), family: "Manrope-ExtraLight", weight: 900)
                .tracking(-3.6).minimumScaleFactor(0.6).lineLimit(1).padding(.bottom, 12)
                Text(profile.detail.cp.intro.value(app.locale)).sourceFont(14).lineSpacing(12.6).fixedSize(horizontal: false, vertical: true).padding(.bottom, 22)
                members
                Button { jumpAnchor = "works" } label: {
                    HStack { Text(copy(.ui, "viewWorks", fallback: "查看共同作品")); Spacer(); SourceIcon("ArrowRight", size: 22) }
                        .sourceFont(15, weight: 750).padding(.horizontal, 24).frame(maxWidth: .infinity, minHeight: 48).background(Pit.ink).foregroundStyle(.white)
                }.buttonStyle(SourceButtonStyle()).padding(.top, 14)
                Button { calendarOpen = true } label: {
                    HStack(spacing: 8) { SourceIcon("CalendarBlank", size: 20); Text(copy(.ui, "cpCalendar", fallback: "她们的播出日历")); SourceIcon("ArrowRight", size: 18) }
                        .sourceFont(13, weight: 600).frame(minHeight: 44)
                }.buttonStyle(SourceButtonStyle()).padding(.top, 10)
            }.padding(.top, 18)
        }
        .padding(.horizontal, 18).padding(.bottom, 30)
    }

    private var statusTag: some View {
        let status = profile.detail.collaboration.status
        let text = copy(.status, status, fallback: status == "active" ? "近期有共同工作依据" : status == "ended" ? "共同工作已结束" : "合作状态待核实")
        return HStack(spacing: 10) {
            Text(text).sourceFont(12, weight: 650).lineLimit(2)
            SourceIcon("ArrowRight", size: 16)
        }.foregroundStyle(Color(red: 86/255, green: 85/255, blue: 79/255))
            .padding(.horizontal, 12).frame(minHeight: 44)
            .background(Color(red: 233/255, green: 231/255, blue: 225/255)).padding(.bottom, 16)
    }

    private var members: some View {
        HStack(alignment: .top, spacing: 10) {
            ForEach(Array(profile.detail.cp.members.enumerated()), id: \.offset) { _, member in
                memberCard(member).frame(maxWidth: .infinity)
            }
        }
    }

    private func memberCard(_ member: CpMember) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(member.name).sourceFont(14, family: "RobotoCondensed-Regular", weight: 750).lineLimit(1).minimumScaleFactor(0.7).padding(.bottom, 8)
            Text(member.profile.fullName).sourceFont(12).foregroundStyle(Color(red: 104/255, green: 104/255, blue: 99/255)).fixedSize(horizontal: false, vertical: true).frame(minHeight: 38, alignment: .topLeading).padding(.bottom, 8)
            memberFact(copy(.ui, "birthday", fallback: "生日"), member.profile.birthday?.replacingOccurrences(of: "-", with: ".") ?? member.profile.birthdayMonthDay?.replacingOccurrences(of: "-", with: ".") ?? copy(.ui, "notVerified", fallback: "尚未核实"))
            if let sign = member.profile.sign { memberFact(copy(.ui, "zodiac", fallback: "星座"), copy(.zodiac, sign, fallback: sign)) }
            if let height = member.profile.heightCm { memberFact(copy(.ui, "height", fallback: "身高"), "\(height) cm") }
            Spacer(minLength: 8)
            social("Instagram", handle: member.instagram, url: member.instagram.map { "https://www.instagram.com/\($0)/" })
            social("X", handle: member.x, url: member.x.map { "https://x.com/\($0)" })
            social(copy(.ui, "weibo", fallback: "微博"), handle: member.weibo?.handle, url: member.weibo?.url)
        }
    }

    private func memberFact(_ label: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(label).foregroundStyle(Color(red: 104/255, green: 104/255, blue: 99/255))
            Text(value).fixedSize(horizontal: false, vertical: true)
        }.sourceFont(12).padding(.vertical, 1)
    }

    @ViewBuilder private func social(_ label: String, handle: String?, url: String?) -> some View {
        if let url, let destination = URL(string: url) {
            Link(destination: destination) {
                HStack(spacing: 6) { Text(label).sourceFont(10).foregroundStyle(Color(red: 104/255, green: 104/255, blue: 99/255)); Text(handle.map { "@\($0)" } ?? label).sourceFont(11).lineLimit(1) }
                    .frame(minHeight: 48).contentShape(Rectangle())
            }.buttonStyle(SourceButtonStyle())
        } else {
            HStack { Text(label); Text(copy(.ui, "notVerified", fallback: "尚未核实")).foregroundStyle(Color(white: 0.5)) }.sourceFont(11).frame(minHeight: 48)
        }
    }

    private var timeline: some View {
        let events = profile.detail.timeline.filter { $0.kind != "conclusion" }
        let visibleEvents = expandedTimeline ? events : Array(events.prefix(6))
        return Group {
            if !events.isEmpty {
                VStack(alignment: .leading, spacing: 0) {
                    CpSectionHeading(title: copy(.journal, "timeline", fallback: "两个人的来时路"), english: "TIMELINE")
                    Text(copy(.journal, "timelineNote", fallback: "各自出发，也曾并肩。按已核实的公开经历整理，持续补录。"))
                        .sourceFont(13).foregroundStyle(Color(red: 98/255, green: 98/255, blue: 94/255)).lineSpacing(11).padding(.bottom, 8)
                    HStack(spacing: 24) {
                        laneLegend(profile.names.first ?? "", color: Pit.ink)
                        laneLegend(profile.names.dropFirst().first ?? "", color: Pit.pink)
                    }.padding(.vertical, 8).padding(.bottom, 10)
                    VStack(spacing: 0) {
                        ForEach(visibleEvents) { event in timelineRow(event) }
                    }
                    if events.count > 6 {
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                expandedTimeline.toggle()
                                if !expandedTimeline { jumpAnchor = "timeline" }
                            }
                        } label: {
                            HStack(spacing: 10) {
                                Text(expandedTimeline ? copy(.journal, "less", fallback: "收起") : "\(copy(.journal, "more", fallback: "展开全部")) · \(events.count)")
                                SourceIcon(expandedTimeline ? "CaretUp" : "CaretDown", size: 16)
                            }.sourceFont(13, weight: 650).padding(.horizontal, 18).frame(minHeight: 44).background(Color(red: 239/255, green: 237/255, blue: 232/255))
                        }.buttonStyle(SourceButtonStyle()).frame(maxWidth: .infinity, alignment: .center).padding(.top, 20)
                    }
                    Text(copy(.journal, "timelineScope", fallback: "只标年份的节点不代表准确首播日；尚未补录的经历不等于没有发生。"))
                        .sourceFont(11).foregroundStyle(Color(red: 104/255, green: 104/255, blue: 99/255)).lineSpacing(8).padding(.top, 20)
                }.padding(.horizontal, 18).padding(.vertical, 24)
            }
        }
    }

    private func laneLegend(_ label: String, color: Color) -> some View {
        HStack(spacing: 7) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(label).sourceFont(14, weight: 750).foregroundStyle(color)
        }
    }

    private func timelineRow(_ event: CpTimelineEvent) -> some View {
        let lane = event.lane
        let joint = lane == "joint"
        let laneName = lane == "0" ? profile.names.first ?? "" : lane == "1" ? profile.names.dropFirst().first ?? "" : copy(.journal, event.kind, fallback: event.kind)
        let color = joint ? Pit.pink : lane == "0" ? Pit.ink : Pit.pink
        return HStack(alignment: .top, spacing: 10) {
            ZStack(alignment: .topLeading) {
                HStack(spacing: 16) {
                    Rectangle().fill(Pit.ink).frame(width: 2)
                    Rectangle().fill(Pit.pink).frame(width: 2)
                }.frame(width: 20)
                if joint {
                    Rectangle().fill(LinearGradient(colors: [Pit.ink, Pit.pink], startPoint: .leading, endPoint: .trailing))
                        .frame(width: 20, height: 2).offset(y: 21)
                } else {
                    Circle().fill(color).frame(width: 10, height: 10).offset(x: lane == "0" ? -4 : 14, y: 17)
                }
            }.frame(width: 20).frame(maxHeight: .infinity)
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(event.date ?? copy(.journal, "datePending", fallback: "日期待定")).sourceFont(14, weight: 750)
                    Text(laneName).sourceFont(10).foregroundStyle(Color(red: 103/255, green: 103/255, blue: 97/255))
                }
                Text(event.title ?? copy(.journal, event.kind, fallback: event.kind)).sourceFont(20, weight: 750).lineSpacing(9).fixedSize(horizontal: false, vertical: true)
                if let detail = event.description ?? event.summary { Text(detail.value(app.locale)).sourceFont(12).lineSpacing(10.2).fixedSize(horizontal: false, vertical: true) }
                if let publisher = event.publisher { Text(publisher).sourceFont(10).foregroundStyle(Color(red: 103/255, green: 103/255, blue: 97/255)) }
            }.padding(14).padding(.bottom, 4).frame(maxWidth: .infinity, alignment: .leading)
                .background(joint ? Color.white : Color(red: 239/255, green: 237/255, blue: 232/255))
                .padding(.vertical, 10)
        }
    }

    private var works: some View {
        let references = profile.detail.cp.works
        let byID = Dictionary(uniqueKeysWithValues: profile.detail.works.map { ($0.id, $0) })
        return VStack(alignment: .leading, spacing: 0) {
            CpSectionHeading(title: copy(.ui, "works", fallback: "她们的作品"), english: "OUR WORKS")
            VStack(alignment: .leading, spacing: 20) {
                ForEach(references) { reference in
                    if let drama = byID[reference.id] { workCard(drama, ensemble: reference.ensemble) }
                }
                ForEach(profile.detail.cp.upcoming ?? []) { upcoming in upcomingCard(upcoming) }
            }
            .padding(.bottom, 26)
        }.padding(.horizontal, 18).padding(.top, 24)
    }

    private func conclusion(_ notice: CpNotice) -> some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack {
                Text("CHAPTER CLOSED").sourceFont(11).tracking(0.8)
                Spacer()
                Text(notice.date.replacingOccurrences(of: "-", with: ".")).sourceFont(11)
            }.foregroundStyle(Color(red: 95/255, green: 94/255, blue: 89/255))
            Text(copy(.journal, "conclusion", fallback: "合作终章")).sourceFont(26, weight: 850).padding(.top, 3)
            Text(copy(.journal, "conclusionNote", fallback: "共同的篇章留在这里，各自的故事仍在继续。"))
                .sourceFont(13).lineSpacing(11.7).foregroundStyle(Color(red: 102/255, green: 100/255, blue: 94/255))
            Text(copy(.journal, "noticeSummary", fallback: "公告摘要") + " · " + notice.publisher)
                .sourceFont(11).foregroundStyle(Color(red: 102/255, green: 100/255, blue: 94/255))
            Text(notice.summary.value(app.locale)).sourceFont(13).lineSpacing(11.7).foregroundStyle(Pit.ink).fixedSize(horizontal: false, vertical: true)
            Button { withAnimation(.easeInOut(duration: 0.2)) { expandedNotice.toggle() } } label: {
                HStack {
                    Text(copy(.journal, expandedNotice ? "closeNotice" : "openNotice", fallback: expandedNotice ? "收起官方通告" : "展开官方通告"))
                    Spacer(); SourceIcon(expandedNotice ? "CaretUp" : "CaretDown", size: 18)
                }.sourceFont(13, weight: 700).frame(minHeight: 48)
            }.buttonStyle(SourceButtonStyle())
            if expandedNotice {
                ForEach(Array(notice.images.enumerated()), id: \.offset) { _, image in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(copy(.journal, image.language == "th" ? "originalTh" : "originalEn", fallback: image.language.uppercased()))
                            .sourceFont(11).foregroundStyle(Color(red: 102/255, green: 100/255, blue: 94/255))
                        LocalArtwork(source: image.image).aspectRatio(contentMode: .fit).background(.white)
                    }
                }
            }
            if let url = URL(string: notice.source) {
                Link(destination: url) { HStack { Text(copy(.journal, "officialPost", fallback: "查看官方原帖")).sourceFont(12, weight: 650); SourceIcon("ArrowUpRight", size: 16) }.frame(minHeight: 44).foregroundStyle(Pit.ink) }
                    .buttonStyle(SourceButtonStyle())
            }
            Text(copy(.journal, "noticeNote", fallback: "仅记录官方确认的工作合作状态，不推断私人关系，也不表示未来不会再次合作。"))
                .sourceFont(11).lineSpacing(8).foregroundStyle(Color(red: 104/255, green: 104/255, blue: 99/255))
        }.padding(.horizontal, 18).padding(.vertical, 22)
            .background(Color(red: 235/255, green: 233/255, blue: 227/255))
            .overlay(alignment: .top) { Rectangle().fill(Color(red: 52/255, green: 52/255, blue: 50/255)).frame(height: 3) }
            .padding(.horizontal, 18).padding(.bottom, 18)
    }

    private func workCard(_ drama: Drama, ensemble: Bool) -> some View {
        Button {
            app.selectedDrama = catalog.dramas.first(where: { $0.id == drama.id }) ?? drama
            app.enter(.archive)
        } label: {
            HStack(alignment: .top, spacing: 16) {
                SourcePhoto(source: drama.image, focus: drama.focus ?? "50% 32%").frame(width: 120, height: 160)
                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .top, spacing: 6) {
                        Text(app.t(drama.title)).sourceFont(26, family: "Georgia", weight: 700).fixedSize(horizontal: false, vertical: true)
                        SourceIcon("ArrowUpRight", size: 20).padding(.top, 5)
                    }
                    HStack(spacing: 10) {
                        Text(drama.year).sourceFont(13)
                        Text(copy(.ui, ensemble ? "ensemble" : "pair", fallback: ensemble ? "群像作品" : "双人主线"))
                            .sourceFont(11).foregroundStyle(Color(red: 88/255, green: 28/255, blue: 55/255))
                            .padding(.horizontal, 8).padding(.vertical, 3).background(Color(red: 248/255, green: 230/255, blue: 238/255))
                    }
                    Spacer(minLength: 0)
                    HStack(spacing: 6) { Text(copy(.ui, "archive", fallback: "考古档案")); SourceIcon("ArrowRight", size: 16) }
                        .sourceFont(13, weight: 600).frame(minHeight: 44)
                }.frame(height: 160, alignment: .top)
                Spacer(minLength: 0)
            }.frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
        }.buttonStyle(SourceButtonStyle()).accessibilityIdentifier("cp-work-\(drama.id)")
    }

    private func upcomingCard(_ work: CpUpcomingWork) -> some View {
        Link(destination: URL(string: work.source)!) {
            HStack(alignment: .top, spacing: 16) {
                SourcePhoto(source: work.image, focus: work.focus ?? "50% 32%").frame(width: 120, height: 160)
                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .top, spacing: 6) {
                        Text(work.title).sourceFont(26, family: "Georgia", weight: 700).fixedSize(horizontal: false, vertical: true)
                        SourceIcon("ArrowUpRight", size: 20).padding(.top, 5)
                    }
                    Text(copy(.ui, work.status ?? "upcoming", fallback: "已官宣 · 档期待定"))
                        .sourceFont(11).foregroundStyle(Color(red: 88/255, green: 28/255, blue: 55/255))
                        .padding(.horizontal, 8).padding(.vertical, 3).background(Color(red: 248/255, green: 230/255, blue: 238/255))
                    Text(copy(.ui, "previewImage", fallback: "官方预告封面") + " · " + work.publisher)
                        .sourceFont(11).foregroundStyle(Color(red: 103/255, green: 103/255, blue: 97/255))
                    Spacer(minLength: 0)
                    HStack(spacing: 6) { Text(copy(.ui, "openPreview", fallback: "观看官方预告")); SourceIcon("ArrowUpRight", size: 16) }
                        .sourceFont(13, weight: 600).frame(minHeight: 44)
                }.frame(height: 160, alignment: .top)
                Spacer(minLength: 0)
            }.frame(maxWidth: .infinity, alignment: .leading)
        }.buttonStyle(SourceButtonStyle())
    }

    private func children(_ child: CpChild) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            CpSectionHeading(title: copy(.children, "title", fallback: "她们的娃"), english: "WITH LOVE")
            Text(copy(.children, "note", fallback: "她们用爱共同创造的小家伙。"))
                .sourceFont(13).foregroundStyle(Color(red: 103/255, green: 103/255, blue: 97/255)).lineSpacing(10.4).padding(.bottom, 20)
            VStack(alignment: .leading, spacing: 0) {
                VStack(spacing: 0) {
                    LocalArtwork(source: child.image, mode: .fit).aspectRatio(1, contentMode: .fit).background(.white)
                    HStack {
                        Text(child.name).sourceFont(15, weight: 800).tracking(0.6)
                        Spacer()
                        Text(child.publisher).sourceFont(10).foregroundStyle(Color(red: 103/255, green: 103/255, blue: 97/255))
                    }.frame(minHeight: 44)
                }.padding(.horizontal, 8).padding(.top, 8).background(.white).rotationEffect(.degrees(-1.5))
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 16) {
                        Text(profile.names.joined(separator: " & ")).sourceFont(13, weight: 650)
                        LocalArtwork(source: "assets/repo-handdrawn-heart-pink.webp", mode: .fit).frame(width: 26, height: 28)
                    }.padding(.bottom, 10)
                    Text(child.name).sourceFont(min(56, viewport.width * 0.12), family: "Manrope-ExtraLight", weight: 850).tracking(-2).foregroundStyle(Color(red: 192/255, green: 25/255, blue: 104/255)).padding(.bottom, 16)
                    HStack(spacing: 16) {
                        Text(copy(.children, "hello", fallback: "初次见面")).foregroundStyle(Color(red: 104/255, green: 101/255, blue: 94/255))
                        Text(child.introduced.replacingOccurrences(of: "-", with: ".")).foregroundStyle(Color(red: 41/255, green: 40/255, blue: 36/255))
                    }.sourceFont(12).padding(.bottom, 16)
                    Text(child.story.value(app.locale)).sourceFont(13).lineSpacing(11.7).fixedSize(horizontal: false, vertical: true).padding(.bottom, 20)
                    if let url = URL(string: child.video.url) {
                        Link(destination: url) {
                            HStack(spacing: 10) {
                                ZStack { SourcePhoto(source: child.video.image).frame(width: 84, height: 47.25); SourceIcon("Play", weight: "fill", size: 16).foregroundStyle(.white) }
                                VStack(alignment: .leading, spacing: 4) { Text(copy(.children, "story", fallback: "一起设计的故事" )).sourceFont(12, weight: 750); Text("MY IDEAL FAN").sourceFont(9).foregroundStyle(Color(red: 103/255, green: 103/255, blue: 97/255)) }
                                Spacer(); SourceIcon("ArrowUpRight", size: 18)
                            }.padding(8).frame(minHeight: 64).background(.white)
                        }.buttonStyle(SourceButtonStyle())
                    }
                }.padding(.top, 28)
            }.padding(.horizontal, 16).padding(.vertical, 20).background(Color(red: 239/255, green: 237/255, blue: 232/255))
        }.padding(.horizontal, 18).padding(.vertical, 28)
    }

    @ViewBuilder private func mediaSection(_ category: String) -> some View {
        let items = profile.detail.media.filter { $0.category == category }
        if !items.isEmpty {
            let expanded = expandedMedia.contains(category)
            VStack(alignment: .leading, spacing: 0) {
                CpSectionHeading(title: copy(.journal, category, fallback: category == "music" ? "音乐与 MV" : "精选影像"), english: category == "music" ? "ON REPEAT" : "IN FRAME")
                Text(copy(.journal, category + "Note", fallback: category == "music" ? "双人合唱、个人演唱，分别标清。" : "官方预告、幕后特辑，还有镜头之外的相处。"))
                    .sourceFont(13).foregroundStyle(Color(red: 98/255, green: 98/255, blue: 94/255)).lineSpacing(11).padding(.bottom, 18)
                ForEach(Array((expanded ? items : Array(items.prefix(3))).enumerated()), id: \.element.id) { index, item in mediaRow(item, index: index) }
                if items.count > 3 {
                    Button { withAnimation { if expanded { _ = expandedMedia.remove(category) } else { _ = expandedMedia.insert(category) } } } label: {
                        HStack(spacing: 10) { Text(copy(.journal, expanded ? "collapse" : "expand", fallback: expanded ? "收起" : "展开全部 · \(items.count)")); SourceIcon(expanded ? "CaretUp" : "CaretDown", size: 16) }
                            .sourceFont(13, weight: 650).padding(.horizontal, 18).frame(minHeight: 44).background(Color(red: 239/255, green: 237/255, blue: 232/255))
                    }.buttonStyle(SourceButtonStyle())
                        .frame(maxWidth: .infinity, alignment: .center).padding(.top, 20)
                }
                Text(copy(.journal, "platformNote", fallback: "播放以平台及地区可用性为准。"))
                    .sourceFont(11).foregroundStyle(Color(red: 104/255, green: 104/255, blue: 99/255)).padding(.top, 20)
            }.padding(.horizontal, 18).padding(.vertical, 24).id(category)
        }
    }

    private func mediaRow(_ item: CpMedia, index: Int) -> some View {
        Link(destination: URL(string: item.url)!) {
            VStack(alignment: .leading, spacing: 0) {
                ZStack(alignment: .bottomTrailing) {
                    Group {
                        if item.square == true { LocalArtwork(source: item.image, mode: .fit).background(Color(red: 233/255, green: 230/255, blue: 224/255)) }
                        else { SourcePhoto(source: item.image) }
                    }.aspectRatio(16/9, contentMode: .fit)
                    Circle().fill(Color(red: 23/255, green: 23/255, blue: 22/255)).frame(width: 38, height: 38)
                        .overlay(SourceIcon("Play", weight: "fill", size: 15).foregroundStyle(.white)).padding(10)
                }
                HStack(spacing: 10) {
                    Text(copy(.journal, item.scope, fallback: item.scope)).foregroundStyle(Color(red: 163/255, green: 19/255, blue: 88/255))
                    Text(copy(.journal, item.kind, fallback: item.kind))
                }.sourceFont(11).foregroundStyle(Color(red: 98/255, green: 98/255, blue: 94/255)).padding(.top, 14).padding(.bottom, 8)
                HStack(alignment: .firstTextBaseline, spacing: 5) { Text(item.title).sourceFont(18, weight: 750).lineSpacing(9.9).fixedSize(horizontal: false, vertical: true); SourceIcon("ArrowUpRight", size: 16) }
                Text(item.performers.joined(separator: " & ")).sourceFont(13).lineSpacing(8.5).padding(.top, 10)
                Text(item.publisher).sourceFont(11).foregroundStyle(Color(red: 98/255, green: 98/255, blue: 94/255)).padding(.top, 5)
            }.contentShape(Rectangle()).padding(.bottom, 26)
        }.buttonStyle(SourceButtonStyle())
    }

    @ViewBuilder private var publicEntries: some View {
        let events = profile.detail.cp.events
        if !events.isEmpty {
            VStack(alignment: .leading, spacing: 0) {
                if !events.isEmpty { CpSectionHeading(title: copy(.ui, "events", fallback: "公开活动"), english: "EVENT"); ForEach(events) { publicEntry($0) } }
            }.padding(.horizontal, 18).padding(.vertical, 24)
        }
    }

    private func publicEntry(_ item: CpPublicEntry) -> some View {
        let destination = URL(string: item.url ?? item.source)!
        return Link(destination: destination) {
            VStack(alignment: .leading, spacing: 0) {
                if let image = item.image { LocalArtwork(source: image, mode: .fit).frame(maxWidth: .infinity, maxHeight: 360).padding(.bottom, 20) }
                Text(item.title).sourceFont(26, family: "Georgia", weight: 700).lineSpacing(6.5).fixedSize(horizontal: false, vertical: true).padding(.bottom, 12)
                Text([item.owner, copy(.ui, item.kind, fallback: item.kind), item.date].compactMap { $0 }.joined(separator: " · ")).sourceFont(13).lineSpacing(9).padding(.bottom, 8)
                HStack(spacing: 14) { Text(copy(.ui, item.kind == "officialShop" ? "openShop" : "openEvent", fallback: item.kind == "officialShop" ? "前往官方商店" : "查看官方公告")); SourceIcon("ArrowUpRight", size: 18) }.sourceFont(14).frame(minHeight: 44)
                if let publisher = item.publisher { Text(publisher + " · " + copy(.ui, "checked", fallback: "核对于") + " " + cpCatalog.verifiedAt).sourceFont(11).foregroundStyle(Color(red: 104/255, green: 104/255, blue: 99/255)).padding(.top, 10) }
            }.frame(maxWidth: .infinity, alignment: .leading).padding(.bottom, 24)
        }.buttonStyle(SourceButtonStyle())
    }

    private var sources: some View {
        DisclosureGroup {
            VStack(alignment: .leading, spacing: 0) {
                Text(copy(.ui, "sourceNote", fallback: "收录已核实的公开资料；缺项不推测。"))
                    .sourceFont(10).foregroundStyle(Color(white: 0.42)).padding(.bottom, 10)
                ForEach(Array(sourceLinks.enumerated()), id: \.offset) { _, item in
                    let label = item.0, value = item.1
                    if let url = URL(string: value) {
                        Link(destination: url) { HStack { Text(label).sourceFont(10).lineLimit(2); Spacer(); SourceIcon("ArrowUpRight", size: 12) }.frame(minHeight: 36) }
                            .buttonStyle(SourceButtonStyle())
                    }
                }
                Text("\(copy(.ui, "checked", fallback: "核对于")) \(cpCatalog.verifiedAt)").sourceFont(9, weight: 700).foregroundStyle(Pit.pink).padding(.top, 8)
            }.padding(.top, 8)
        } label: {
            Text(copy(.ui, "sources", fallback: "资料与来源")).sourceFont(13, weight: 780).frame(minHeight: 44)
        }.tint(Pit.ink).padding(.horizontal, 18).padding(.vertical, 12).overlay(alignment: .top) { Rectangle().fill(Pit.ink).frame(height: 1) }
    }

    private var sourceLinks: [(String, String)] {
        var items = profile.detail.cp.members.map { ($0.name, $0.source) }
        items += profile.detail.cp.works.map { ($0.title, $0.source) }
        items += profile.detail.media.map { ($0.title, $0.source) }
        if let child = profile.detail.child { items.append((child.name, child.source)) }
        if let notice = profile.detail.notice { items.append((notice.publisher, notice.source)) }
        return items
    }
}

private struct CpSectionHeading: View {
    let title: String
    let english: String
    var body: some View {
        HStack(alignment: .center, spacing: 10) {
            Text(title).sourceFont(26, family: "RobotoCondensed-Regular", weight: 900).tracking(-0.9).fixedSize(horizontal: false, vertical: true)
            Text(english).sourceFont(10, family: "RobotoCondensed-Regular", weight: 600).foregroundStyle(Color(red: 163/255, green: 19/255, blue: 88/255)).tracking(1.3)
            Spacer(minLength: 0)
        }.padding(.bottom, 20)
    }
}

private struct CpDirectorySheet: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.dismiss) private var dismiss
    let catalog: CpCatalog
    @Binding var selected: String
    @State private var query = ""
    @FocusState private var searchFocused: Bool
    private var profiles: [CpProfile] { catalog.profiles.filter { $0.matches(query) } }
    private var activeCount: Int { catalog.profiles.filter { $0.status == "active" }.count }
    private var endedCount: Int { catalog.profiles.filter { $0.status == "ended" }.count }
    private var pendingCount: Int { catalog.profiles.filter { $0.status == "unverified" }.count }
    private func copy(_ section: CpCopySection, _ key: String, fallback: String) -> String { catalog.copy(section, key, locale: app.locale) ?? fallback }
    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(copy(.ui, "allCps", fallback: "全部 CP")).sourceFont(20, weight: 800)
                Spacer()
                Text("\(profiles.count) / \(catalog.profiles.count)").sourceFont(12).foregroundStyle(Color(red: 104/255, green: 104/255, blue: 99/255))
                Button { dismiss() } label: { SourceIcon("X", size: 22).frame(width: 44, height: 44) }.accessibilityLabel(copy(.ui, "closeDirectory", fallback: "关闭 CP 目录"))
            }.padding(.leading, 18).padding(.trailing, 14).padding(.top, 12).padding(.bottom, 8)
            directoryStats.padding(.horizontal, 18).padding(.bottom, 12)
            HStack(spacing: 8) {
                SourceIcon("MagnifyingGlass", size: 18).foregroundStyle(Color(red: 104/255, green: 104/255, blue: 99/255))
                TextField(copy(.ui, "search", fallback: "搜索 CP / 演员 / 剧名"), text: $query)
                    .sourceFont(16).textInputAutocapitalization(.never).autocorrectionDisabled().focused($searchFocused)
                if !query.isEmpty { Button { query = "" } label: { SourceIcon("X", size: 15).frame(width: 44, height: 44) }.accessibilityLabel(copy(.ui, "clearSearch", fallback: "清除搜索")) }
            }.padding(.leading, 10).frame(height: 44)
                .background(RoundedRectangle(cornerRadius: 24).fill(Color(red: 239/255, green: 237/255, blue: 232/255)))
                .padding(.horizontal, 18).padding(.bottom, 12)
            ScrollView {
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 6), GridItem(.flexible())], spacing: 6) {
                    ForEach(profiles) { profile in
                        Button {
                            selected = profile.id
                            dismiss()
                        } label: {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(profile.label).sourceFont(14, family: "RobotoCondensed-Regular", weight: 800).lineLimit(1).minimumScaleFactor(0.72)
                                Text(profile.names.joined(separator: " / ")).sourceFont(11).foregroundStyle(Color(red: 104/255, green: 104/255, blue: 99/255)).lineLimit(1).minimumScaleFactor(0.68)
                                Text(copy(.status, profile.status, fallback: profile.status)).sourceFont(10).foregroundStyle(profile.status == "active" ? Color(red: 163/255, green: 19/255, blue: 88/255) : Color(red: 104/255, green: 104/255, blue: 99/255))
                            }.padding(.horizontal, 12).frame(maxWidth: .infinity, minHeight: 64, alignment: .leading).contentShape(Rectangle())
                                .background(selected == profile.id ? Color(red: 247/255, green: 213/255, blue: 230/255) : Color(red: 239/255, green: 237/255, blue: 232/255))
                                .foregroundStyle(selected == profile.id ? Color(red: 137/255, green: 25/255, blue: 76/255) : Pit.ink)
                        }.buttonStyle(SourceButtonStyle()).accessibilityIdentifier("cp-directory-\(profile.id)")
                    }
                }.padding(.horizontal, 18).padding(.bottom, 20)
            }.scrollDismissesKeyboard(.interactively)
        }.background(Pit.paper).buttonStyle(SourceButtonStyle())
            .overlay(alignment: .top) { Rectangle().fill(Pit.pink).frame(height: 4) }
            .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { searchFocused = false } }
    }

    private var directoryStats: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text("\(catalog.profiles.count)").sourceFont(19, weight: 750).foregroundStyle(Color(red: 37/255, green: 36/255, blue: 33/255))
            Text(app.locale == "zh" ? "CP" : app.locale == "th" ? "คู่" : "CPs").sourceFont(12)
            Spacer(minLength: 2)
            stat(activeCount, "active")
            stat(endedCount, "ended")
            stat(pendingCount, "unverified")
        }.foregroundStyle(Color(red: 104/255, green: 104/255, blue: 99/255))
    }

    private func stat(_ value: Int, _ key: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 3) {
            Text("\(value)").sourceFont(12, weight: 750).foregroundStyle(key == "active" ? Color(red: 163/255, green: 19/255, blue: 88/255) : Pit.ink)
            Text(copy(.status, key, fallback: key)).sourceFont(11).lineLimit(1).minimumScaleFactor(0.75)
        }
    }
}
