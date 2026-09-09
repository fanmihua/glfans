import SwiftUI
import Photos
import GlfansCore

struct MemeView: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.accessibilityReduceMotion) var reduceMotion
    let catalog: Catalog
    @State private var selected = 0
    @State private var ejected = false
    @State private var developing = false
    @State private var busy = false
    @State private var message: String?
    @State private var sharing = false
    @State private var generation = 0
    @State private var captured: [Int] = []
    var meme: Meme { catalog.memes[selected] }
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                PaperHeading(title: "来捡表情包", subtitle: "MEME PIT · TAKE A LITTLE FEELING")
                ZStack(alignment: .top) {
                    LocalArtwork(source: "assets/meme-game/meme-camera-three-quarter-empty-v2.webp").frame(height: 220)
                    VStack(spacing: 8) {
                        LocalArtwork(source: meme.src).frame(width: 165, height: 145).opacity(developing ? 1 : 0.05)
                        Text(meme.title).font(.caption.bold()).foregroundStyle(Pit.ink)
                    }.padding(12).padding(.bottom, 12).background(.white).shadow(color: .black.opacity(0.14), radius: 8, y: 6)
                        .rotationEffect(.degrees(ejected ? -6 : -12)).scaleEffect(ejected ? 1 : 0.2, anchor: .top)
                        .offset(y: ejected ? 170 : 130).opacity(ejected ? 1 : 0)
                }.frame(height: ejected ? 395 : 240)
                if captured.count == catalog.memes.count && !busy {
                    Button { captured = []; ejected = false; developing = false } label: { Label(app.t("重新装填胶卷"), systemImage: "arrow.clockwise").frame(maxWidth: .infinity).pitButton() }
                } else {
                    Button { capture() } label: { Label(app.t(busy ? "显影中…" : ejected ? "再拍一张" : "拍一张"), systemImage: "camera.fill").frame(maxWidth: .infinity).pitButton() }.disabled(busy)
                }
                if ejected && !busy {
                    Text(app.t(meme.note)).font(.subheadline).foregroundStyle(.secondary)
                    HStack(spacing: 24) {
                        Button { Task { await save() } } label: { Label(app.t("保存图片"), systemImage: "square.and.arrow.down").frame(minHeight: 44) }
                        Button { sharing = true } label: { Label(app.t("分享"), systemImage: "square.and.arrow.up").frame(minHeight: 44) }
                    }
                }
                if let message { Text(app.t(message)).font(.caption).foregroundStyle(.secondary) }
                ScrollView(.horizontal) {
                    HStack(spacing: 14) {
                        ForEach(0..<catalog.memes.count, id: \.self) { slot in
                            if captured.indices.contains(slot) {
                                let index = captured[slot]
                                let item = catalog.memes[index]
                                Button { guard !busy else { return }; selected = index; ejected = true; developing = true } label: { LocalArtwork(source: item.src).frame(width: 80, height: 80).padding(8).background(.white).overlay(Rectangle().stroke(selected == index ? Pit.pink : .clear, lineWidth: 2)) }.accessibilityLabel(item.title)
                            } else { Text(String(format: "%02d", slot + 1)).font(.caption.monospaced()).foregroundStyle(.secondary).frame(width: 96, height: 96).background(.white.opacity(0.5)) }
                        }
                    }
                }.scrollIndicators(.hidden)
                Text(app.t("表情包仅供粉丝交流使用，相关素材权利归原权利人。")).font(.caption2).foregroundStyle(.secondary)
            }.padding(20)
        }.background(Pit.paper)
        .sheet(isPresented: $sharing) { if let image = Artwork.image(meme.src) { ActivitySheet(items: [image]) } }
        .onDisappear { generation += 1; if busy { ejected = true; developing = true; if !captured.contains(selected) { captured.append(selected) } }; busy = false }
    }
    func capture() {
        generation += 1; let current = generation
        busy = true; ejected = false; developing = false; message = nil
        guard let next = catalog.memes.indices.filter({ !captured.contains($0) }).randomElement() else { busy = false; return }
        selected = next
        if reduceMotion { ejected = true; developing = true; captured.append(selected); busy = false; return }
        Task {
            try? await Task.sleep(for: .milliseconds(100)); guard generation == current else { return }
            withAnimation(.easeOut(duration: 1.2)) { ejected = true }
            try? await Task.sleep(for: .seconds(1.2)); guard generation == current else { return }
            withAnimation(.easeIn(duration: 1.4)) { developing = true }
            try? await Task.sleep(for: .seconds(1.4)); guard generation == current else { return }; captured.append(selected); busy = false
        }
    }
    func save() async {
        let status = await PHPhotoLibrary.requestAuthorization(for: .addOnly)
        guard status == .authorized || status == .limited else { message = "需要允许添加照片后才能保存。"; return }
        guard let image = Artwork.image(meme.src) else { message = "图片暂时无法读取"; return }
        do { try await PHPhotoLibrary.shared().performChanges { PHAssetChangeRequest.creationRequestForAsset(from: image) }; message = "已保存到相册" }
        catch { message = error.localizedDescription }
    }
}
struct ActivitySheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController { UIActivityViewController(activityItems: items, applicationActivities: nil) }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
