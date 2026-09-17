import SwiftUI
import Photos
import GlfansCore

private struct CapturedMeme: Identifiable {
    var id: String { meme.id }
    let meme: Meme
    let date: Date
    var time: String { let f = DateFormatter(); f.dateFormat = "HH:mm:ss"; return f.string(from: date) }
}

/// Source state machine: focusing 260ms, ejecting 920ms, revealed 460ms,
/// archiving 1050ms. The camera, rail, paper and six slots use source geometry.
struct MemeView: View {
    @ObservedObject private var handwriting=SourceHandwriting.shared
    @EnvironmentObject var app: AppModel
    @Environment(\.sourceViewport) private var viewport
    @Environment(\.sourceBottomInset) private var bottom
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    let catalog: Catalog
    @State private var captures: [CapturedMeme] = []
    @State private var current: CapturedMeme?
    @State private var centered: Int? = 0
    @State private var elapsed = 0.0
    @State private var generation = 0
    @State private var message: String?
    @State private var share: SharedArtwork?
    private var exhausted: Bool { catalog.memes.allSatisfy { item in captures.contains { $0.id == item.id } } }
    private let slotOffsets: [CGFloat] = [7, -5, 4, -7, 6, -3]
    private var collectedLabel: String {
        app.locale == "zh" ? "\(catalog.memes.count) 张表情包已全部收齐" : app.locale == "th" ? "เก็บมีมครบทั้ง \(catalog.memes.count) ภาพแล้ว" : "Collected all \(catalog.memes.count) memes"
    }
    private var status: String {
        if current == nil { return exhausted ? "今天已收齐" : "按住对焦" }
        return elapsed < 0.26 ? "对焦中" : elapsed < 1.18 ? "出片中" : elapsed < 1.64 ? "已显影" : "已收好"
    }
    var body: some View {
        let w = viewport.width, slotW = min(225, max(190, viewport.width * 0.52))
        let slotH = slotW / 1.26, filmH = slotH + 84
        let gameH = max(viewport.height - 90 - bottom, 80 + 350 + filmH)
        let heroH = gameH - 80 - filmH, titleSize = min(64, max(48, w * 0.144))
        let introH = titleSize * 1.1664 * 0.78 + 24 + min(23, max(18, w * 0.048)) * 1.18
        let cameraW = min(330, w * 0.72), cameraH = cameraW * 56 / 65
        let camera = CGRect(x: (w - cameraW) / 2, y: 80 + 8 + introH + 16 + (heroH - 8 - introH - 16 - cameraH) / 2, width: cameraW, height: cameraH)
        let filmY = 80 + heroH - 12
        ScrollView {
            ZStack(alignment: .topLeading) {
                intro(size: titleSize).frame(width: w).at(x: 0, y: 88)
                cameraView(camera).frame(width: cameraW, height: cameraH).at(x: camera.minX, y: camera.minY)
                film(slotW: slotW, slotH: slotH).frame(width: w, height: filmH).at(x: 0, y: filmY)
                if let current, elapsed >= 0.26 {
                    movingPrint(current, camera: camera, slotW: slotW, slotH: slotH, filmY: filmY)
                        .allowsHitTesting(false).zIndex(30)
                }
            }.frame(width: w, height: gameH).clipped()
            if let message { Text(app.t(message)).sourceFont(12).padding(.horizontal, 20).accessibilityIdentifier("meme-result") }
            Color.clear.frame(height: 90 + bottom)
        }.scrollIndicators(.hidden).background(Pit.paper).buttonStyle(SourceButtonStyle())
            .task {if app.locale=="zh" {handwriting.prepare()}}
            .sheet(item: $share) { item in ActivitySheet(items: [item.image]) }
            .onChange(of: app.contentVersion) { _, _ in
                let ids = Set(catalog.memes.map(\.id))
                captures = captures.compactMap { capture in
                    guard let updated = catalog.memes.first(where: { $0.id == capture.id }) else { return nil }
                    return CapturedMeme(meme: updated, date: capture.date)
                }
                if let current, !ids.contains(current.id) { self.current = nil; generation += 1 }
            }
            .task(id: generation) {
                guard current != nil else { return }
                let clock = ContinuousClock(); var previous = clock.now
                while !Task.isCancelled && current != nil {
                    do { try await Task.sleep(for: .milliseconds(17)) } catch { return }
                    let instant = clock.now, delta = previous.duration(to: instant)
                    previous = instant
                    if scenePhase == .active { elapsed += (Double(delta.components.seconds) + Double(delta.components.attoseconds) / 1e18) * (reduceMotion ? 20 : 1) }
                    if elapsed >= 2.69, let value = current {
                        captures.append(value); current = nil
                    }
                }
            }
    }
    private func intro(size: CGFloat) -> some View {
        VStack(spacing: 24) {
            HStack(alignment: .bottom, spacing: size * 0.055) {
                letters("MEME", size: size, scales: [0.9,1.07,0.96,1.09], ys: [-0.03,0.045,-0.05,0.025], rotations: [-1.4,0.9,-0.7,1.2], pink: false)
                letters("PIT", size: size * 1.08, scales: [1.04,0.91,1.08], ys: [0.015,-0.035,0.04], rotations: [-1,1.1,-0.8], pink: true)
                    .offset(x: size * 1.08 * 0.02, y: size * 1.08 * 0.035)
            }.overlay(alignment: .bottomLeading) {
                SourceTexture("assets/repo-handdrawn-underline-pink.webp").frame(width: size * 1.72, height: size * 0.16).rotationEffect(.degrees(0.9)).offset(x: size * 3.15, y: size * 0.25).accessibilityHidden(true)
            }.scaleEffect(x: 0.94, y: 1).rotationEffect(.degrees(-2.4))
                .overlay(alignment: .topLeading) {
                    LocalArtwork(source: "assets/repo-handdrawn-heart-pink.webp").frame(width: 46, height: 46).rotationEffect(.degrees(-8)).offset(x: -14, y: -8).accessibilityHidden(true)
                }
            HStack(spacing: 0) {
                let fs:CGFloat = app.locale == "zh" ? min(23, max(18, viewport.width * 0.048)):15
                Text(app.t("请看镜头，")).sourceFont(fs, family: app.locale == "zh" ? handwriting.family : app.locale == "th" ? "NotoSansThai-Regular" : "Manrope-ExtraLight", weight: 400)
                Text(app.t("保持嘴硬")).sourceFont(fs, family: app.locale == "zh" ? handwriting.family : app.locale == "th" ? "NotoSansThai-Regular" : "Manrope-ExtraLight", weight: 400).padding(.leading, fs * 0.28)
                SourceIcon("Sparkle", weight: "fill", size: fs * 0.9).foregroundStyle(Color(red: 233/255, green: 88/255, blue: 142/255)).rotationEffect(.degrees(-18)).padding(.leading, fs * 0.32)
            }.tracking(min(23, max(18, viewport.width * 0.048)) * 0.04).rotationEffect(.degrees(-1.2))
        }.fixedSize()
    }
    private func letters(_ text: String, size: CGFloat, scales: [CGFloat], ys: [CGFloat], rotations: [Double], pink: Bool) -> some View {
        HStack(alignment: .bottom, spacing: 0) {
            ForEach(Array(text.enumerated()), id: \.offset) { i, c in
                SourceLine(text: String(c), size: size * scales[i], family: "AlibabaPuHuiTi-Heavy", weight: 900, kern: -size * 0.025, lineHeight: size * scales[i] * 0.78, color: UIColor(pink ? Pit.pink : Pit.ink))
                    .offset(y: size * scales[i] * ys[i]).rotationEffect(.degrees(rotations[i]), anchor: .bottom)
            }
        }
    }
    private func cameraView(_ rect: CGRect) -> some View {
        ZStack(alignment: .topLeading) {
            LocalArtwork(source: "assets/meme-game/meme-camera-three-quarter-empty-v2.webp").frame(width: rect.width, height: rect.height)
                .scaleEffect(current != nil && elapsed < 0.26 ? 1 + 0.008 * sin(elapsed / 0.26 * .pi) : 1)
            Button(action: capture) { Color.clear.frame(width: max(44, rect.width * 0.145), height: max(44, rect.width * 0.145)).contentShape(Circle()) }.buttonStyle(.plain)
                .position(x: rect.width * 0.175, y: rect.height * 0.485)
                .disabled(current != nil || exhausted).accessibilityLabel(exhausted ? collectedLabel : app.t("按下快门拍一张表情包")).accessibilityIdentifier("meme-shutter")
            HStack(spacing: 8) {
                Circle().fill(Color(red: 233/255, green: 88/255, blue: 142/255)).frame(width: 7, height: 7)
                SourceLine(text: app.t(status), size: 8, weight: 760, kern: 0.4, color: .white)
            }.padding(.horizontal, 8).frame(height: 22).background(Color(red: 24/255, green: 23/255, blue: 24/255).opacity(0.9), in: Capsule())
                .at(x: rect.width * 0.265, y: rect.height * 0.493).allowsHitTesting(false)
        }
    }
    private func film(slotW: CGFloat, slotH: CGFloat) -> some View {
        ScrollViewReader { reader in
            ScrollView(.horizontal) {
                HStack(spacing: 26) {
                    ForEach(0..<(catalog.memes.count + 1), id: \.self) { i in
                        slot(i, width: slotW, height: slotH).frame(width: slotW, height: slotH)
                            .modifier(SourcePaperPerspective()).offset(y: slotOffsets[i % slotOffsets.count]).id(i)
                    }
                }.scrollTargetLayout().padding(.top, 20).padding(.bottom, 30)
            }.contentMargins(.horizontal, max(22, (viewport.width - slotW) / 2), for: .scrollContent)
                .scrollIndicators(.hidden).scrollTargetBehavior(.viewAligned).scrollPosition(id: $centered, anchor: .center)
                .padding(.top, 8).padding(.bottom, 26)
                .onChange(of: generation) { _, _ in withAnimation(reduceMotion ? nil : .easeOut(duration: 0.3)) { reader.scrollTo(captures.count, anchor: .center) } }
        }
    }
    @ViewBuilder private func slot(_ index: Int, width: CGFloat, height: CGFloat) -> some View {
        if captures.indices.contains(index) {
            let value = captures[index], active = index == captures.count - 1
            ZStack(alignment: .bottomLeading) {
                LocalArtwork(source: value.meme.src).saturation(active ? 0.92 : 0).contrast(active ? 1.02 : 1.05)
                    .frame(width: width - 14, height: height - 41).background(Color(red: 222/255, green: 219/255, blue: 212/255))
                    .scaleEffect(active ? 1.035 : 1).clipped().padding(.horizontal, 7).padding(.top, 7).padding(.bottom, 34)
                SourceLine(text: value.time, size: 11, family: "RobotoCondensed-Regular", weight: 780, lineHeight: 11, color: UIColor(Color(red: 233/255, green: 88/255, blue: 142/255))).padding(.leading, 9).padding(.bottom, 10)
                HStack(spacing: 2) {
                    Button { Task { await save(value.meme) } } label: { SourceIcon("DownloadSimple", size: 16).frame(width: 44, height: 44) }.accessibilityLabel(app.t("下载这张"))
                    Button(action: capture) { SourceIcon("ArrowCounterClockwise", size: 16).frame(width: 44, height: 44) }.disabled(current != nil || exhausted).accessibilityLabel(app.t("再拍一张表情包"))
                }.offset(y: 6).padding(.trailing, 3).frame(maxWidth: .infinity, alignment: .trailing)
            }.background(Color(red: 251/255, green: 248/255, blue: 241/255))
                .overlay(Rectangle().stroke(active ? Color(red: 233/255, green: 88/255, blue: 142/255) : Pit.ink.opacity(0.18), lineWidth: 1))
                .contextMenu { Button(app.t("分享")) { Task { await shareImage(value.meme.src) } } }
                .accessibilityIdentifier("meme-capture-\(index)")
        } else if exhausted && index == catalog.memes.count {
            VStack(spacing: 7) {
                Text("✦").sourceFont(13).foregroundStyle(Pit.pink)
                Text(app.t("胶卷拍空啦")).sourceFont(13, weight: 700)
                Text(collectedLabel + "\n" + app.t("再按就要拍到真心了。")).sourceFont(8).multilineTextAlignment(.center)
            }.frame(maxWidth: .infinity, maxHeight: .infinity).background(Color(red: 1, green: 242/255, blue: 247/255)).overlay(Rectangle().stroke(Pit.pink.opacity(0.48), lineWidth: 1))
        } else {
            ZStack {
                Rectangle().fill(Color(red: 238/255, green: 236/255, blue: 230/255))
                    .overlay(Rectangle().stroke(Pit.ink.opacity(0.16), style: StrokeStyle(lineWidth: 1, dash: [3, 3])))
                SourceIcon("Question", weight: "bold", size: 26).foregroundStyle(Pit.ink.opacity(0.12))
            }.padding(.horizontal, 7).padding(.top, 7).padding(.bottom, 34).background(Color(red: 251/255, green: 248/255, blue: 241/255))
                .overlay(Rectangle().stroke(Pit.ink.opacity(0.1), lineWidth: 1)).opacity(0.36)
        }
    }
    private func movingPrint(_ capture: CapturedMeme, camera: CGRect, slotW: CGFloat, slotH: CGFloat, filmY: CGFloat) -> some View {
        let printW = camera.width * 0.4, printH = printW / 1.26
        let eject = min(1, max(0, (elapsed - 0.26) / 0.92))
        let progress = sourceEase(eject, 0.18, 0.72, 0.24, 1)
        let keys: [(Double, Double)] = [(0,-1.06),(0.62,0.04),(0.82,0.22),(0.91,0.16),(1,0.18)]
        let pair = zip(keys, keys.dropFirst()).first { progress <= $0.1.0 } ?? (keys[3], keys[4])
        let offset = pair.0.1 + (pair.1.1 - pair.0.1) * (progress - pair.0.0) / (pair.1.0 - pair.0.0)
        let travel = sourceEase(min(1, max(0, (elapsed - 1.64) / 1.05)), 0.4, 0, 0.2, 1)
        let x0 = camera.minX + camera.width * 0.395
        let y0 = camera.minY + camera.height * 0.68 + printH * (0.5 + offset)
        let y1 = filmY + 8 + 20 + slotH / 2 + slotOffsets[captures.count % slotOffsets.count]
        let developed = min(1, max(0, (elapsed - 1.18) / 0.42))
        return ZStack {
            LocalArtwork(source: capture.meme.src).saturation(0.92).contrast(1.02).opacity(0.34 + developed * 0.66)
                .blur(radius: (1 - developed) * 4).background(Color(red: 222/255, green: 219/255, blue: 212/255))
                .overlay(Color(red: 251/255, green: 248/255, blue: 241/255).opacity((1 - developed) * 0.82))
                .padding(.horizontal, printW * 0.066).padding(.top, printW * 0.066).padding(.bottom, printW * 0.18)
        }.frame(width: printW, height: printH).background(Color(red: 251/255, green: 248/255, blue: 241/255))
            .modifier(SourcePaperPerspective()).scaleEffect(0.96 + travel * (slotW / printW - 0.96))
            .position(x: x0 + travel * (viewport.width / 2 - x0), y: y0 + travel * (y1 - y0))
            .mask(alignment: .top) { Rectangle().padding(.top, elapsed < 1.18 ? camera.minY + camera.height * 0.68 : 0) }
    }
    private func capture() {
        guard current == nil, !exhausted, let meme = catalog.memes.filter({ item in !captures.contains(where: { $0.id == item.id }) }).randomElement() else { return }
        current = CapturedMeme(meme: meme, date: Date()); elapsed = 0; centered = captures.count; message = nil; generation += 1
    }
    private func shareImage(_ source: String) async {
        guard let image = await Artwork.load(source) else { message = "图片暂时无法读取"; return }
        share = SharedArtwork(image: image)
    }
    private func save(_ meme: Meme) async {
        let status = await PHPhotoLibrary.requestAuthorization(for: .addOnly)
        guard status == .authorized || status == .limited else { message = "需要允许添加照片后才能保存。"; return }
        guard let image = await Artwork.load(meme.src) else { message = "图片暂时无法读取"; return }
        do { try await PHPhotoLibrary.shared().performChanges { PHAssetChangeRequest.creationRequestForAsset(from: image) }; message = "已保存到相册" }
        catch { message = error.localizedDescription }
    }
}

struct SourcePaperPerspective: GeometryEffect {
    func effectValue(size: CGSize) -> ProjectionTransform {
        let matrix = CGAffineTransform(a: 0.992978, b: 0.0436343, c: -0.174797, d: 0.999391, tx: 0, ty: 0)
        return ProjectionTransform(CGAffineTransform(translationX: -size.width/2, y: -size.height/2).concatenating(matrix).concatenating(.init(translationX: size.width/2, y: size.height/2)))
    }
}
func sourceEase(_ time: Double, _ x1: Double, _ y1: Double, _ x2: Double, _ y2: Double) -> Double {
    func cubic(_ t: Double, _ a: Double, _ b: Double) -> Double { let u = 1-t; return 3*u*u*t*a+3*u*t*t*b+t*t*t }
    if time <= 0 { return 0 }; if time >= 1 { return 1 }
    var lo = 0.0, hi = 1.0
    for _ in 0..<16 { let mid = (lo+hi)/2; if cubic(mid,x1,x2) < time { lo = mid } else { hi = mid } }
    return cubic((lo+hi)/2,y1,y2)
}
struct ActivitySheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController { UIActivityViewController(activityItems: items, applicationActivities: nil) }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}

private struct SharedArtwork: Identifiable { let id = UUID(); let image: UIImage }
