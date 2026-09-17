import SwiftUI
import GlfansCore

private struct SourceViewportKey: EnvironmentKey { static let defaultValue = CGSize(width: 428, height: 878) }
private struct SourceBottomInsetKey: EnvironmentKey { static let defaultValue: CGFloat = 0 }
extension EnvironmentValues {
    var sourceViewport: CGSize { get { self[SourceViewportKey.self] } set { self[SourceViewportKey.self] = newValue } }
    var sourceBottomInset: CGFloat { get { self[SourceBottomInsetKey.self] } set { self[SourceBottomInsetKey.self] = newValue } }
}

/// SiteHeader.jsx + mobile-section-nav.css + LanguageSwitcher, including hit areas.
struct PitHeader: View {
    @EnvironmentObject private var app: AppModel
    var body: some View {
        ZStack {
            HStack {
                Button { app.enter(.archive) } label: {
                    LocalArtwork(source: "assets/glfans-logo-brush.webp", mode: .fill)
                        .frame(width: 48, height: 48 / 1.43).clipped().frame(height: 44)
                }.accessibilityLabel(app.t("考古档案"))
                Spacer()
                Button { app.enter(.about) } label: {
                    SourceIcon("Info").foregroundStyle(app.section == .about ? Pit.pink : Pit.ink).frame(width: 44, height: 44)
                }.accessibilityLabel(app.t("关于 glfans"))
            }
            HStack(spacing: 0) {
                ForEach(Array(zip(["zh", "en", "th"], ["中", "EN", "TH"])), id: \.0) { code, short in
                    Button { app.locale = code } label: {
                        SourceLine(text: short, size: 11, weight: 700, lineHeight: 15.4,
                                   color: UIColor(app.locale == code ? Pit.ink : Color(red: 115/255, green: 115/255, blue: 109/255)))
                            .frame(width: 44, height: 44).contentShape(Rectangle())
                            .background {
                                if app.locale == code {
                                    RoundedRectangle(cornerRadius: 2).fill(Color(red: 1, green: 143/255, blue: 194/255))
                                        .shadow(color: .black.opacity(0.07), radius: 1, y: 1).padding(.vertical, 10).padding(.horizontal, 1)
                                }
                            }
                    }.accessibilityLabel(code == "zh" ? "中文" : code == "en" ? "English" : "ไทย")
                        .accessibilityIdentifier("language-\(code)")
                        .accessibilityAddTraits(app.locale == code ? .isSelected : [])
                }
            }.padding(.horizontal, 3)
                .background(RoundedRectangle(cornerRadius: 4).fill(Color(red: 234/255, green: 234/255, blue: 229/255)).padding(.vertical, 8))
        }.padding(.horizontal, 16).frame(height: 45).padding(.bottom, 1).background(Pit.paper.opacity(0.96))
            .overlay(alignment: .bottom) { Rectangle().fill(Pit.ink).frame(height: 1) }.buttonStyle(SourceButtonStyle())
    }
}

struct PitBottomNavigation: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.sourceBottomInset) private var bottom
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var taps:[Int:Int]=[:]
    private let icons = ["FilmStrip", "UsersThree", "Files", "ImageSquare"]
    var body: some View {
        GeometryReader { proxy in
            let gap = min(10, max(5, proxy.size.width * 0.02))
            ZStack(alignment: .top) {
                SourceTexture("assets/repo-collection-black-torn-v2.webp")
                    .frame(height: 180 + bottom).offset(y: 12).allowsHitTesting(false)
                HStack(spacing: gap) {
                    ForEach(Array(AppSection.navigation.enumerated()), id: \.element) { index, section in
                        Button {
                            taps[index,default:0] += 1
                            app.enter(section)
                        } label: {
                            VStack(spacing: 4) {
                                SourceIcon(icons[index], weight: app.section == section ? "fill" : "regular")
                                    .frame(height: 24).modifier(SourceTabTap(index:index,revision:taps[index,default:0]))
                                SourceLine(text: app.t(section.shortTitle), size: 13,
                                           family: app.locale == "th" ? "NotoSansThai-Regular" : "RobotoCondensed-Regular",
                                           weight: 750, kern: 0.39, lineHeight: 14.3,
                                           color: app.section == section ? .white : UIColor(Pit.ink))
                            }.foregroundStyle(app.section == section ? .white : Pit.ink)
                        }
                        .buttonStyle(SourcePaperTabStyle(active: app.section == section, tilt: [-2, 1.6, -1, 2, -1.4, 1.3][index], playing: false))
                        .accessibilityLabel(app.t(section.title)).accessibilityIdentifier("tab-\(section.rawValue)")
                        .accessibilityAddTraits(app.section == section ? .isSelected : []).zIndex(app.section == section ? 1 : 0)
                    }
                }.frame(maxWidth: 540).padding(.horizontal, 12).padding(.top, 6)
            }
        }.frame(height: 90 + bottom).clipped()
    }
}

private struct SourceTabMotion {var y:CGFloat=0;var turn:Double=0;var yaw:Double=0;var scaleX:CGFloat=1}
private struct SourceTabTap:ViewModifier {
    let index:Int;let revision:Int
    @Environment(\.accessibilityReduceMotion) var reduceMotion
    func body(content:Content)->some View {
        let d=[0.34,0.38,0.42,0.38,0.46,0.44][index]
        content.keyframeAnimator(initialValue:SourceTabMotion(),trigger:revision) {view,value in
            view.offset(y:value.y).scaleEffect(x:value.scaleX,y:1)
                .rotationEffect(.degrees(value.turn)).rotation3DEffect(.degrees(value.yaw),axis:(x:0,y:1,z:0),perspective:0.3)
        } keyframes: {_ in
            KeyframeTrack(\.y) {
                CubicKeyframe(reduceMotion ? 0:index==0 ? -4:index==3 ? -5:0,duration:d*0.4)
                CubicKeyframe(!reduceMotion && index==0 ? 1:0,duration:d*0.3)
                CubicKeyframe(0,duration:d*0.3)
            }
            KeyframeTrack(\.turn) {
                MoveKeyframe(!reduceMotion && index==4 ? -90:0)
                CubicKeyframe(reduceMotion ? 0:index==1 ? -8:index==3 ? 9:0,duration:d*0.45)
                CubicKeyframe(0,duration:d*0.55)
            }
            KeyframeTrack(\.yaw) {CubicKeyframe(!reduceMotion && index==2 ? -35:0,duration:d*0.45);CubicKeyframe(0,duration:d*0.55)}
            KeyframeTrack(\.scaleX) {CubicKeyframe(!reduceMotion && index==1 ? 1.2:1,duration:d*0.45);CubicKeyframe(1,duration:d*0.55)}
        }
    }
}

private struct SourcePaperTabStyle: ButtonStyle {
    var active: Bool
    var tilt: Double
    var playing: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func makeBody(configuration: Configuration) -> some View {
        ZStack(alignment: .top) {
            ZStack(alignment: .bottom) {
                SourceTexture("assets/mobile-nav-paper.webp").modifier(PaperRecolor(active: active))
                if active {
                    Rectangle().fill(Pit.pink).mask(SourceTexture("assets/mobile-nav-paper.webp"))
                        .mask(VStack(spacing: 0) { Color.clear; Rectangle().frame(height: 6) })
                }
                configuration.label.padding(.horizontal, 3).padding(.vertical, 8)
                if playing { Circle().fill(Pit.pink).frame(width: 5, height: 5).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing).padding(5) }
            }.frame(height: 64)
                .rotationEffect(.degrees(configuration.isPressed ? 0 : active ? -2 : tilt), anchor: .bottom)
                .scaleEffect(configuration.isPressed ? 0.96 : 1, anchor: .bottom)
                .offset(y: configuration.isPressed ? -3 : active ? -8 : 0).padding(.top, 8)
                .animation(reduceMotion ? nil : .timingCurve(0.2, 0.8, 0.25, 1, duration: 0.28), value: active)
                .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: configuration.isPressed)
                .allowsHitTesting(false)
        }.frame(maxWidth: .infinity).frame(height: 74).contentShape(Rectangle())
    }
}
private struct PaperRecolor: ViewModifier {
    var active: Bool
    @ViewBuilder func body(content: Content) -> some View {
        if active { content.colorInvert().saturation(0).colorMultiply(Color(white: 0.8)) }
        else { content }
    }
}

struct PitRootChrome: ViewModifier {
    func body(content: Content) -> some View { content.toolbar(.hidden, for: .navigationBar).background(Pit.paper) }
}
