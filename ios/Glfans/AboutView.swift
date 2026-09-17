import SwiftUI

/// AboutPage.jsx and about-page.css <=620px; copy is extracted from that source.
struct AboutView: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.sourceViewport) private var viewport
    @Environment(\.sourceBottomInset) private var bottom
    @State private var rightsOpen = false
    @State private var privacyOpen = false
    private var family: String { app.locale == "th" ? "NotoSansThai-Regular" : "RobotoCondensed-Regular" }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                title.padding(.leading, 12)
                if let copy = app.sourceContent?.about {
                    VStack(alignment: .leading, spacing: 16) {
                        (Text(app.t(copy.intro))+Text(app.t(copy.emphasis)).bold())
                            .sourceFont(14,family:family,weight:400).tracking(0.21).lineSpacing(5.7)
                            .fixedSize(horizontal:false,vertical:true)
                    }.padding(.top, 30).padding(.bottom, 24)
                    makers.padding(.top, 26)
                    rights(copy).padding(.top, 24)
                    contentRefresh.padding(.top, 20)
                }
            }.padding(.horizontal, 22).padding(.top, 96).padding(.bottom, 28)
                .background(alignment: .topLeading) {
                    SourceLine(text: app.t("ABOUT"), size: viewport.width * 0.29, family: "AlibabaPuHuiTi-Heavy", weight: 900,
                               kern: -viewport.width * 0.0232, lineHeight: viewport.width * 0.232)
                        .opacity(0.018).offset(x: 10, y: 128).accessibilityHidden(true)
                }
            SourceFooterFilm().frame(height: 64)
            VStack(alignment: .leading, spacing: 0) {
                Button { privacyOpen.toggle() } label: {
                    HStack { Text(app.t("隐私与数据")).sourceFont(12, family: family, weight: 700); Spacer(); SourceIcon("CaretDown", size: 14).rotationEffect(.degrees(privacyOpen ? 180 : 0)) }.frame(minHeight: 44)
                }.accessibilityIdentifier("about-privacy")
                if privacyOpen {
                    privacyDetails
                }
            }.padding(.horizontal, 22).padding(.top, 12)
                .padding(.bottom, 90 + bottom)
        }.scrollIndicators(.hidden).background(Pit.paper).buttonStyle(SourceButtonStyle())
    }
    private func localized(_ zh: String, _ en: String, _ th: String) -> String {
        app.locale == "en" ? en : app.locale == "th" ? th : zh
    }
    private var contentRefresh: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(localized("资料更新", "Content updates", "อัปเดตข้อมูล")).sourceFont(14, weight: 700)
            Text(localized("剧集、播出日历、百家饭与 REPO 会随网站更新。打开 App 或返回前台时自动检查，也可以手动刷新。离线时显示已保存的内容。", "Drama, calendar, CP and REPO content follows website updates. The app checks when opened or brought to the foreground. You can also refresh manually; saved content remains available offline.", "ข้อมูลซีรีส์ ปฏิทิน คู่จิ้น และ REPO อัปเดตตามเว็บไซต์ แอปตรวจสอบเมื่อเปิดหรือกลับมาใช้งาน และรีเฟรชเองได้ ข้อมูลที่บันทึกไว้ยังอ่านแบบออฟไลน์ได้")).sourceFont(12).fixedSize(horizontal: false, vertical: true)
            if let checked = app.contentLastCheckedAt {
                Text(localized("最近检查：", "Last checked: ", "ตรวจสอบล่าสุด: ") + checked.formatted(date: .abbreviated, time: .shortened)).sourceFont(11).foregroundStyle(.secondary)
            }
            Button {
                Task { await app.refreshContent(force: true) }
            } label: {
                HStack(spacing: 8) {
                    if app.refreshingContent { ProgressView().controlSize(.small) }
                    Text(localized(app.refreshingContent ? "正在更新" : "刷新资料", app.refreshingContent ? "Updating" : "Refresh content", app.refreshingContent ? "กำลังอัปเดต" : "รีเฟรชข้อมูล"))
                    Spacer()
                    Image(systemName: "arrow.clockwise").font(.system(size: 18))
                }.sourceFont(13, weight: 650).frame(minHeight: 44)
            }.disabled(app.refreshingContent).accessibilityIdentifier("refresh-content")
            if app.contentError != nil {
                Text(localized("暂时无法更新，已保留本机资料。稍后可以重试。", "Update unavailable. Saved content is still available. Please try again later.", "ยังอัปเดตไม่ได้ ข้อมูลที่บันทึกไว้ยังใช้งานได้ โปรดลองอีกครั้งภายหลัง")).sourceFont(12).foregroundStyle(Pit.pink)
            }
        }
    }
    private var privacyDetails: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(localized("无需注册。语言、关注列表与内容缓存保存在本机，不上传关注偏好。没有广告或跨 App 跟踪。", "No account is required. Language, followed dramas and cached content stay on your device. Follow preferences are not uploaded. There are no ads or cross-app tracking.", "ไม่ต้องสมัครบัญชี ภาษา รายการติดตาม และแคชอยู่ในอุปกรณ์ ไม่ส่งรายการติดตามไปยังเซิร์ฟเวอร์ ไม่มีโฆษณาหรือการติดตามข้ามแอป")).sourceFont(12)
            Text(localized("内容更新会连接 glfans.com。服务器保留必要的访问与错误日志，包括 IP、请求地址和时间，用于提供服务与排查问题。保存表情包时只请求添加照片权限，不读取你的相册。", "Content updates connect to glfans.com. Necessary access and error logs, including IP address, request path and time, are retained to operate and troubleshoot the service. Saving a meme requests add-only photo access and does not read your library.", "การอัปเดตเชื่อมต่อ glfans.com เซิร์ฟเวอร์เก็บบันทึกการเข้าถึงและข้อผิดพลาดที่จำเป็น เช่น IP ที่อยู่คำขอและเวลา เพื่อให้บริการและแก้ปัญหา การบันทึกมีมขอสิทธิ์เพิ่มรูปเท่านั้น ไม่อ่านคลังรูปภาพ")).sourceFont(12)
            Link(localized("完整隐私政策", "Privacy policy", "นโยบายความเป็นส่วนตัว"), destination: URL(string: "https://glfans.com/app-privacy/")!).sourceFont(12).frame(minHeight: 44)
            Link(localized("联系支持", "Contact support", "ติดต่อฝ่ายสนับสนุน") + " · " + SupportContact.email, destination: SupportContact.url).sourceFont(12).frame(minHeight: 44)
        }.fixedSize(horizontal: false, vertical: true)
    }
    private var title: some View {
        let size = min(80, max(58, viewport.width * 0.204))
        return VStack(alignment: .leading, spacing: 0) {
            if app.locale == "zh" {
                VStack(alignment: .leading, spacing: size * 0.1) {
                    HStack(alignment: .bottom, spacing: 0) {
                        SourceLine(text: "关", size: size, family: "AlibabaPuHuiTi-Heavy", weight: 900, kern: -size * 0.11, lineHeight: size * 0.92)
                            .offset(y: -size * 0.01).rotationEffect(.degrees(-2))
                        SourceLine(text: "于", size: size * 0.48, family: "AlibabaPuHuiTi-Heavy", weight: 900, kern: -size * 0.11, lineHeight: size * 0.48 * 0.92, color: UIColor(Pit.pink))
                            .offset(y: -size * 0.48 * 0.18).rotationEffect(.degrees(1)).padding(.leading, size * 0.48 * 0.15)
                    }.rotationEffect(.degrees(-1.8))
                    HStack(spacing: 0) {
                        ForEach(Array("这个坑".enumerated()), id: \.offset) { i, c in
                            SourceLine(text: String(c), size: size, family: "AlibabaPuHuiTi-Heavy", weight: 900, kern: -size * 0.06, lineHeight: size * 0.92)
                                .offset(y: size * [-0.02, 0.02, -0.01][i]).rotationEffect(.degrees([-1.5, 1, -0.8][i]))
                        }
                    }.padding(.leading, size * 0.12).rotationEffect(.degrees(-2.6))
                }.accessibilityElement(children: .ignore).accessibilityLabel(app.t("关于这个坑"))
            } else {
                VStack(alignment: .leading, spacing: 0) {
                    Text(app.locale == "en" ? "About" : "เกี่ยวกับ").sourceFont(min(72,max(48,viewport.width * 0.14)), family: app.locale == "en" ? "AlibabaPuHuiTi-Heavy" : family, weight: 900).rotationEffect(.degrees(-1.8))
                    Text(app.locale == "en" ? "this pit" : "ด้อมนี้").sourceFont(min(72,max(48,viewport.width * 0.14)), family: app.locale == "en" ? "AlibabaPuHuiTi-Heavy" : family, weight: 900).rotationEffect(.degrees(-2.6))
                }
            }
            SourceTexture("assets/repo-handdrawn-underline-pink.webp").frame(width: min(442, viewport.width * 0.714), height: 29)
                .rotationEffect(.degrees(-1.8)).padding(.leading, 12).padding(.top, -12)
            SourceParagraph(source: SourceLine(text: app.t("这次真的不一样。"), size: app.locale == "zh" ? min(29, max(22, viewport.width * 0.068)):16,
                family: app.locale == "th" ? family : "AlibabaPuHuiTi-Heavy", weight: 900, kern: app.locale == "zh" ? -1.2:0,
                lineHeight: app.locale == "zh" ? min(29, max(22, viewport.width * 0.068)):22.4, color: .white), maxWidth: viewport.width - 100)
                .padding(.horizontal, 16).padding(.top, 12).padding(.bottom, 13).background(Pit.ink)
                .rotationEffect(.degrees(-2.6)).padding(.leading, 5).padding(.top, 6)
        }.overlay(alignment: .topLeading) {
            LocalArtwork(source: "assets/repo-handdrawn-heart-pink.webp").frame(width: 36, height: 36).rotationEffect(.degrees(-14)).offset(x: -8, y: 99).accessibilityHidden(true)
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
    private var makers: some View {
        VStack(alignment: .leading, spacing: 26) {
            HStack(spacing: 12) {
                SourceLine(text: app.t("挖坑的人"), size: 19, family: family, weight: 780, kern: 1.52, lineHeight: 19)
                    .padding(.horizontal, 14).padding(.top, 7).padding(.bottom, 8).background(Color(red: 1, green: 197/255, blue: 223/255))
                LocalArtwork(source: "assets/repo-handdrawn-heart-pink.webp").frame(width: 30, height: 30).accessibilityHidden(true)
            }
            HStack(alignment: .top, spacing: 20) {
                maker("Conceal", "Content", "写字的，收藏心动与情绪。", "让爱有迹可循。")
                maker("范米花儿", "Design & Dev", "做页面的，搭建与维护这个小窝。", "让热爱有处安放。")
            }.overlay { Rectangle().fill(Pit.ink.opacity(0.24)).frame(width: 1).padding(.vertical, 4) }
        }
    }
    private func maker(_ name: String, _ role: String, _ line1: String, _ line2: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(name).sourceFont(min(28, max(24, viewport.width * 0.07)), family: family, weight: 780).tracking(0.27)
            Text(app.t(role)).sourceFont(12, family: family, weight: 820).tracking(0.48).foregroundStyle(Pit.pink).padding(.top, 14)
            SourceParagraph(source: SourceLine(text: app.t(line1) + "\n" + app.t(line2), size: 13, family: family, weight: 460, lineHeight: 21.06), maxWidth: (viewport.width - 64) / 2).padding(.top, 9)
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
    private func rights(_ copy: WebsiteContent.About) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Button { rightsOpen.toggle() } label: {
                VStack(alignment: .leading, spacing: 8) {
                    Text(app.t("RIGHTS & CREDITS")).sourceFont(10, family: family, weight: 700).tracking(1.6).foregroundStyle(Pit.pink)
                    HStack(spacing: 18) {
                        Text(app.t("版权与权利说明")).sourceFont(18, family: family, weight: 700).tracking(0.72)
                        Spacer(minLength: 0)
                        Text(app.t("展开完整说明")).sourceFont(10, family: family, weight: 700).foregroundStyle(rightsOpen ? Color(white: 0.38) : Pit.pink)
                    }
                    paragraph("非官方粉丝共创站 · 非商业用途 · 第三方素材相关权利归原权利人", size: 10, height: 15.5, color: Pit.ink.opacity(0.64))
                }.padding(.vertical, 15).frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
            }.accessibilityIdentifier("about-rights")
            if rightsOpen {
                VStack(alignment: .leading, spacing: 24) {
                    ForEach(copy.rights) { item in
                        VStack(alignment: .leading, spacing: 9) {
                            Text(app.t(item.title)).sourceFont(13, family: family, weight: 700).tracking(0.78)
                            paragraph(item.text, size: 12, height: 21.84)
                            if item.title == "权利反馈" {
                                Link(app.t("提交权利反馈"), destination: URL(string: "https://github.com/fanmihua/glfans/issues/new?template=rights-feedback.yml")!)
                                    .sourceFont(11, family: family, weight: 700).foregroundStyle(Pit.pink).underline().frame(minHeight: 44)
                            }
                        }
                    }
                    paragraph(copy.copyright, size: 10, height: 18.2, color: Pit.ink.opacity(0.58)).padding(.top, 18)
                        .overlay(alignment: .top) { Rectangle().fill(Pit.ink.opacity(0.14)).frame(height: 1) }
                }.padding(.top, 22).padding(.bottom, 24)
                    .overlay(alignment: .top) { Rectangle().stroke(Pit.ink.opacity(0.32), style: StrokeStyle(lineWidth: 1, dash: [4, 3])).frame(height: 1) }
            }
        }.background(.white.opacity(0.22))
            .overlay(alignment: .top) { Rectangle().fill(Pit.ink.opacity(0.42)).frame(height: 1) }
            .overlay(alignment: .bottom) { Rectangle().fill(Pit.ink.opacity(0.42)).frame(height: 1) }
    }
    private func paragraph(_ value: String, size: CGFloat, height: CGFloat, color: Color = Pit.ink) -> some View {
        SourceParagraph(source: SourceLine(text: app.t(value), size: size, family: family, weight: 400, kern: size == 14 ? 0.21 : 0, lineHeight: height, color: UIColor(color)), maxWidth: viewport.width - 44)
    }
}

struct SourceFooterFilm: View {
    @EnvironmentObject private var app: AppModel
    var body: some View {
        GeometryReader { g in
            HStack(spacing: 7) {
                SourceIcon("Plus", size: 18).frame(width: 20)
                HStack(spacing: 6) {
                    ForEach(Array((app.sourceContent?.footerFilm ?? []).prefix(4))) { film in
                        SourcePhoto(source: film.image, focus: film.focus).saturation(0).contrast(1.18).opacity(0.78)
                            .overlay(Rectangle().stroke(.white.opacity(0.34), lineWidth: 1))
                    }
                }.frame(height: 50).clipped()
                SourceIcon("Plus", size: 18).frame(width: 20)
            }.padding(.horizontal, 12).frame(height: g.size.height).foregroundStyle(Pit.pink).background(Pit.ink)
        }.accessibilityLabel("合集影像胶卷")
    }
}
