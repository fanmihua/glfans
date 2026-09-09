import SwiftUI
import GlfansCore

struct RadioView: View {
    @EnvironmentObject var app: AppModel
    @EnvironmentObject var radio: RadioPlayer
    @Environment(\.accessibilityReduceMotion) var reduceMotion
    let catalog: Catalog
    @State private var playlist = false
    @State private var help = false
    @State private var seekValue: Double?
    var station: Station? { catalog.radio.stations.first { $0.id == radio.stationID } }
    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                HStack(alignment: .bottom) {
                    PaperHeading(title: "坑底电台", subtitle: "PIT FM")
                    Button { help = true } label: { Image(systemName: "questionmark.circle").frame(width: 44, height: 44) }.accessibilityLabel(app.t("怎么玩"))
                }
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ForEach(catalog.radio.stations) { value in
                        Button { radio.select(value) } label: {
                            HStack(spacing: 8) {
                                LocalArtwork(source: value.artwork).frame(width: 60, height: 65).saturation(value.id == radio.stationID ? 1 : 0)
                                VStack(alignment: .leading, spacing: 5) { Text(value.name).font(.caption.bold()); Text("\(value.tracks.count) " + app.t("首歌")).font(.caption2) }
                            }.frame(maxWidth: .infinity, minHeight: 74).background(value.id == radio.stationID ? Pit.pink.opacity(0.14) : .white).clipShape(RoundedRectangle(cornerRadius: 6))
                        }.buttonStyle(.plain).draggable(value.id)
                    }
                }
                GeometryReader { geometry in
                    ZStack {
                        LocalArtwork(source: "assets/pit-radio/turntable-chassis-record-backing-v3.webp")
                        TimelineView(.animation(minimumInterval: 1 / 30, paused: !radio.playing || reduceMotion)) { timeline in
                            ZStack {
                                Circle().fill(.black)
                                ForEach(0..<6) { i in Circle().stroke(.white.opacity(0.12), lineWidth: 1).padding(CGFloat(i) * 8 + 8) }
                                Circle().fill(Pit.pink).padding(geometry.size.width * 0.17)
                                Text("PIT FM").font(.caption2.bold()).foregroundStyle(.white)
                            }.rotationEffect(.degrees(radio.playing && !reduceMotion ? timeline.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 4) * 90 : 0))
                        }.frame(width: geometry.size.width * 0.54, height: geometry.size.width * 0.54).offset(x: -geometry.size.width * 0.07, y: -geometry.size.height * 0.05)
                        LocalArtwork(source: "assets/pit-radio/turntable-tonearm-v2.webp").frame(width: geometry.size.width * 0.25).rotationEffect(.degrees(radio.playing ? 12 : -12), anchor: .topTrailing).offset(x: geometry.size.width * 0.25, y: -20)
                            .onTapGesture { radio.toggle() }.gesture(DragGesture(minimumDistance: 15).onEnded { _ in radio.toggle() })
                    }.contentShape(Rectangle()).dropDestination(for: String.self) { items, _ in guard let id = items.first, let station = catalog.radio.stations.first(where: { $0.id == id }) else { return false }; radio.select(station); return true }
                }.frame(height: 270)
                VStack(spacing: 8) {
                    Text(radio.track?.name ?? app.t("先选一对 CP")).font(.title3.bold()).multilineTextAlignment(.center)
                    Text(radio.track?.artists.joined(separator: " / ") ?? "PIT FM").font(.caption).foregroundStyle(.secondary)
                }.frame(maxWidth: .infinity)
                if let error = radio.error { Text(app.t(error)).font(.caption).foregroundStyle(.red) }
                if radio.track != nil {
                    Slider(value: Binding(get: { seekValue ?? min(radio.elapsed, max(radio.duration, 1)) }, set: { seekValue = $0 }), in: 0...max(radio.duration, 1), onEditingChanged: { editing in if !editing, let value = seekValue { radio.seek(value); seekValue = nil } }).accessibilityLabel(app.t("播放进度"))
                    HStack { Text(clock(radio.elapsed)); Spacer(); Text(clock(radio.duration)) }.font(.caption.monospacedDigit()).foregroundStyle(.secondary)
                }
                HStack(spacing: 14) {
                    Button { radio.repeatOne.toggle() } label: { Image(systemName: radio.repeatOne ? "repeat.1" : "repeat").frame(width: 44, height: 44) }.accessibilityLabel(app.t("循环"))
                    Button { radio.previous() } label: { Image(systemName: "backward.end.fill").frame(width: 44, height: 44) }.accessibilityLabel(app.t("上一首歌"))
                    Button { radio.toggle() } label: { Group { if radio.loading { ProgressView().tint(.white) } else { Image(systemName: radio.playing ? "pause.fill" : "play.fill") } }.frame(width: 60, height: 60).background(Pit.ink).foregroundStyle(.white).clipShape(Circle()) }.accessibilityLabel(app.t(radio.playing ? "暂停" : "落针播放"))
                    Button { radio.next() } label: { Image(systemName: "forward.end.fill").frame(width: 44, height: 44) }.accessibilityLabel(app.t("下一首歌"))
                    Button { playlist = true } label: { Image(systemName: "list.bullet").frame(width: 44, height: 44) }.accessibilityLabel(app.t("歌单"))
                }.font(.title3).disabled(radio.track == nil)
                Link(app.t("网易云完整歌单"), destination: URL(string: "https://music.163.com/#/playlist?id=" + catalog.radio.playlistId)!).font(.subheadline).frame(minHeight: 44)
                Text(app.t("网易云歌单音源 · 权利归原权利人")).font(.caption2).foregroundStyle(.secondary)
            }.padding(20)
        }.background(Pit.paper)
        .sheet(isPresented: $playlist) {
            NavigationStack {
                List(station?.tracks ?? []) { track in
                    Button { if let station { radio.select(station, track: track, autoplay: true) }; playlist = false } label: {
                        HStack { VStack(alignment: .leading, spacing: 5) { Text(track.name); Text(track.artists.joined(separator: " / ")).font(.caption).foregroundStyle(.secondary) }; Spacer(); if radio.track?.id == track.id { Image(systemName: "waveform") } }.frame(minHeight: 44)
                    }.foregroundStyle(Pit.ink)
                }.navigationTitle(station?.name ?? "PIT FM").toolbar { ToolbarItem(placement: .confirmationAction) { Button(app.t("完成")) { playlist = false } } }
            }.presentationDetents([.medium, .large])
        }
        .sheet(isPresented: $help) {
            NavigationStack {
                VStack(alignment: .leading, spacing: 24) {
                    Text(app.t("点一下贴纸，也可以拖入唱片"))
                    Text(app.t("点播放或唱针，也可以拖动唱针"))
                    Text(app.t("点下一首，或点列表图标选歌"))
                }.font(.title3.bold()).padding(30).frame(maxWidth: .infinity, maxHeight: .infinity).background(Pit.paper)
                    .navigationTitle(app.t("怎么玩")).toolbar { ToolbarItem(placement: .confirmationAction) { Button(app.t("完成")) { help = false } } }
            }.presentationDetents([.medium, .large])
        }
    }
    func clock(_ value: Double) -> String { guard value.isFinite else { return "0:00" }; let seconds = max(0, Int(value)); return String(format: "%d:%02d", seconds / 60, seconds % 60) }
}
