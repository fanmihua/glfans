import AVFoundation
import MediaPlayer
import GlfansCore

@MainActor final class RadioPlayer: ObservableObject {
    @Published var track: Track?
    @Published var stationID: String?
    @Published var playing = false
    @Published var loading = false
    @Published var repeatOne = false
    @Published var error: String?
    @Published var elapsed = 0.0
    @Published var duration = 0.0
    private let player = AVPlayer()
    private var queue: [Track] = []
    private var position = 0
    private var observation: NSKeyValueObservation?
    private var itemObservation: NSKeyValueObservation?
    private var timeObserver: Any?
    private var notifications: [NSObjectProtocol] = []
    private var resumeAfterInterruption = false
    private var mediaArtwork: MPMediaItemArtwork?
    private var preparation: Task<Void, Never>?
    private var wantsPlayback = false
    init() {
        observation = player.observe(\.timeControlStatus, options: [.new]) { [weak self] player, _ in
            Task { @MainActor in
                self?.playing = player.timeControlStatus == .playing
                self?.loading = player.timeControlStatus == .waitingToPlayAtSpecifiedRate || self?.preparation != nil
                self?.updateNowPlaying()
            }
        }
        timeObserver = player.addPeriodicTimeObserver(forInterval: CMTime(seconds: 1, preferredTimescale: 600), queue: .main) { [weak self] time in
            Task { @MainActor in
                guard let self else { return }
                self.elapsed = time.seconds.isFinite ? time.seconds : 0
                let total = self.player.currentItem?.duration.seconds ?? 0
                self.duration = total.isFinite ? total : Double(self.track?.duration ?? 0) / 1000
                self.updateNowPlaying()
            }
        }
        notifications.append(NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: nil, queue: .main) { [weak self] note in
            Task { @MainActor in
                guard let self, let item = note.object as? AVPlayerItem, item === self.player.currentItem else { return }
                if self.repeatOne { self.player.seek(to: .zero); self.player.play() } else { self.next(autoplay: true) }
            }
        })
        notifications.append(NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] note in
            let type = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt
            let options = note.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
            Task { @MainActor in
                guard let self else { return }
                if type == AVAudioSession.InterruptionType.began.rawValue { self.resumeAfterInterruption = self.playing || self.wantsPlayback; self.pause() }
                else if self.resumeAfterInterruption && AVAudioSession.InterruptionOptions(rawValue: options).contains(.shouldResume) { self.play() }
            }
        })
        notifications.append(NotificationCenter.default.addObserver(forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main) { [weak self] note in
            if (note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt) == AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue { Task { @MainActor in self?.pause() } }
        })
        let commands = MPRemoteCommandCenter.shared()
        commands.playCommand.addTarget { [weak self] _ in Task { @MainActor in self?.play() }; return .success }
        commands.pauseCommand.addTarget { [weak self] _ in Task { @MainActor in self?.pause() }; return .success }
        commands.togglePlayPauseCommand.addTarget { [weak self] _ in Task { @MainActor in self?.toggle() }; return .success }
        commands.nextTrackCommand.addTarget { [weak self] _ in Task { @MainActor in self?.next() }; return .success }
        commands.previousTrackCommand.addTarget { [weak self] _ in Task { @MainActor in self?.previous() }; return .success }
        commands.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let event = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
            Task { @MainActor in self?.seek(event.positionTime) }; return .success
        }
    }
    func select(_ station: Station, track selected: Track? = nil, autoplay: Bool = false) {
        if stationID == station.id && selected == nil { return }
        let wasPlaying = playing || wantsPlayback
        queue = station.tracks; stationID = station.id
        position = selected.flatMap { value in queue.firstIndex(where: { $0.id == value.id }) } ?? 0
        prepare()
        if autoplay || wasPlaying { play() }
    }
    private func prepare() {
        guard queue.indices.contains(position) else { return }
        preparation?.cancel(); wantsPlayback = false
        player.pause(); player.replaceCurrentItem(with: nil); track = queue[position]; elapsed = 0; error = nil; loading = true
        guard let track else { return }
        duration = Double(track.duration) / 1000
        if let image = Artwork.image(track.cpArtwork) { mediaArtwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image } } else { mediaArtwork = nil }
        updateNowPlaying()
        preparation = Task { [weak self] in
            do {
                let url = try await AudioSourceResolver.resolve(track.outerUrl)
                guard !Task.isCancelled, let self, self.track?.id == track.id else { return }
                let item = AVPlayerItem(url: url)
                self.itemObservation = item.observe(\.status, options: [.new]) { [weak self] item, _ in
                    Task { @MainActor in if item.status == .failed { self?.error = "音源暂时无法播放，请稍后重试。"; self?.loading = false; self?.wantsPlayback = false } }
                }
                self.player.replaceCurrentItem(with: item); self.preparation = nil; self.loading = false
                if self.wantsPlayback { self.player.play() }
            } catch {
                guard !Task.isCancelled, let self, self.track?.id == track.id else { return }
                self.preparation = nil; self.loading = false; self.wantsPlayback = false; self.error = "音源暂时无法播放，请稍后重试。"
            }
        }
    }
    func play() {
        guard track != nil else { return }
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
            if player.currentItem?.status == .failed || (player.currentItem == nil && preparation == nil) { prepare() }
            wantsPlayback = true
            if player.currentItem != nil { player.play() }; error = nil
        } catch { self.error = error.localizedDescription }
    }
    func pause() { wantsPlayback = false; player.pause() }
    func toggle() { if playing || wantsPlayback { pause() } else { play() } }
    func next(autoplay: Bool? = nil) { guard !queue.isEmpty else { return }; let shouldPlay = autoplay ?? (playing || wantsPlayback); position = (position + 1) % queue.count; prepare(); if shouldPlay { play() } }
    func previous() { guard !queue.isEmpty else { return }; let shouldPlay = playing || wantsPlayback; position = (position - 1 + queue.count) % queue.count; prepare(); if shouldPlay { play() } }
    func seek(_ seconds: Double) { guard seconds.isFinite else { return }; player.seek(to: CMTime(seconds: max(0, seconds), preferredTimescale: 600)); elapsed = seconds; updateNowPlaying() }
    private func updateNowPlaying() {
        guard let track else { return }
        var info: [String: Any] = [MPMediaItemPropertyTitle: track.name, MPMediaItemPropertyArtist: track.artists.joined(separator: " / "), MPMediaItemPropertyAlbumTitle: track.album, MPMediaItemPropertyPlaybackDuration: duration, MPNowPlayingInfoPropertyElapsedPlaybackTime: elapsed, MPNowPlayingInfoPropertyPlaybackRate: playing ? 1 : 0]
        if let mediaArtwork { info[MPMediaItemPropertyArtwork] = mediaArtwork }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }
}
