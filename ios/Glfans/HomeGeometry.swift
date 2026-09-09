import Foundation
import GlfansCore

/// Values and equations translated from home-page.css and useMobileHomeOrbits.js.
struct HomeGeometry {
    let size: CGSize
    let cards: [HomeCard]
    var w: CGFloat { size.width }
    var h: CGFloat { max(620, size.height) }
    var shift: CGFloat { min(20, max(12, h * 0.02)) }
    var portal: CGRect { let width = w * 1.16; return CGRect(x: -w * 0.08, y: h * 0.975 - width * 0.75, width: width, height: width * 0.75) }
    var pitCenter: CGPoint { CGPoint(x: portal.midX, y: portal.minY + portal.height * 0.61) }
    static let rotations: [Double] = [5, -7, 8, -5, -8]
    func coverCards(falling: Bool = false) -> [CGRect] {
        let top = max(h * 0.33, 260), groupH = h * 0.67 - top
        let sizes: [CGFloat] = [min(w * 0.38, groupH * 0.50, 190), min(w * 0.35, groupH * 0.40, 180), min(w * 0.32, groupH * 0.43, 165), min(w * 0.35, groupH * 0.40, 180), min(w * 0.29, groupH * 0.32, 145)]
        let xs = [w * 0.94 - sizes[0], w * 0.06, w * 0.93 - sizes[2], w * 0.06, w * 0.16]
        let ys: [CGFloat] = [0, 0.03, 0.50, 0.35, 0.68]
        var frames = cards.enumerated().map { i, card in CGRect(x: xs[i], y: top + groupH * ys[i], width: sizes[i], height: sizes[i] * card.height / card.width) }
        if falling {
            let first = frames.map(\.minY).min() ?? 0, last = frames.map(\.minY).max() ?? 1
            let lift = max(0, first - max(48, h * 0.14) + shift)
            for i in frames.indices { frames[i].origin.y -= lift * (last - frames[i].minY) / max(1, last - first) }
        }
        return frames
    }
    var eyesGroup: CGRect { CGRect(x: 22, y: h * 0.43, width: w - 44, height: h * 0.46) }
    func eyesCards() -> [CGRect] {
        let g = eyesGroup
        let widths = [min(g.width * 0.46, g.height * 0.43, 190), min(g.width * 0.40, g.height * 0.37, 164), min(g.width * 0.36, g.height * 0.36, 150), min(g.width * 0.40, g.height * 0.37, 164)]
        let heights = cards.prefix(4).enumerated().map { i,c in widths[i] * c.height / c.width }
        let xs = [g.width * 0.96 - widths[0], g.width * 0.03, g.width * 0.97 - widths[2], g.width * 0.04]
        let ys = [CGFloat(0), g.height * 0.20, g.height * 0.62, g.height - heights[3]]
        return (0..<4).map { CGRect(x: g.minX + xs[$0], y: g.minY + ys[$0], width: widths[$0], height: heights[$0]) }
    }
    var welcomeGroup: CGRect {
        let top = h * 0.12 + min(78, max(58, w * 0.18)) * 0.76 + min(136, max(104, w * 0.31)) * 0.76 + 24
        return CGRect(x: 22, y: top, width: w - 44, height: max(1, h - 244 - top))
    }
}

struct HomeCubic {
    let start: CGPoint, c1: CGPoint, c2: CGPoint, end: CGPoint
    func point(_ t: Double) -> CGPoint {
        let t = CGFloat(t), u = 1 - t
        return CGPoint(x: u*u*u*start.x + 3*u*u*t*c1.x + 3*u*t*t*c2.x + t*t*t*end.x,
                       y: u*u*u*start.y + 3*u*u*t*c1.y + 3*u*t*t*c2.y + t*t*t*end.y)
    }
    // CSS offset-distance advances by arc length, not by Bezier parameter.
    func atDistance(_ progress: Double) -> CGPoint {
        let points = (0...80).map { point(Double($0) / 80) }
        var lengths = [Double(0)]
        for i in 1..<points.count { lengths.append(lengths.last! + hypot(points[i].x - points[i-1].x, points[i].y - points[i-1].y)) }
        let target = lengths.last! * min(1, max(0, progress))
        let index = lengths.firstIndex(where: { $0 >= target }) ?? 80
        guard index > 0 else { return start }
        let part = (target - lengths[index-1]) / max(0.0001, lengths[index] - lengths[index-1])
        return CGPoint(x: points[index-1].x + (points[index].x-points[index-1].x)*part, y: points[index-1].y + (points[index].y-points[index-1].y)*part)
    }
}
struct HomeFall {
    let curve: HomeCubic
    let rotation: Double, duration: Double, initialSpeed: Double
    static func motions(_ geometry: HomeGeometry, seed: UInt32) -> [HomeFall] {
        var state = seed
        func random() -> Double { state = 1664525 &* state &+ 1013904223; return Double(state) / 4294967296 }
        func between(_ a: Double, _ b: Double) -> Double { a + random() * (b-a) }
        let end = geometry.pitCenter, w = geometry.w
        return geometry.coverCards(falling: true).enumerated().map { i, card in
            let start = CGPoint(x: card.midX, y: card.midY), dy = end.y - start.y
            let left = min(start.x, end.x, card.width * 0.65 + 12), right = max(start.x, end.x, w - card.width * 0.65 - 12)
            func clamp(_ x: CGFloat) -> CGFloat { max(left, min(right, x)) }
            let c1 = CGPoint(x: clamp(start.x + (end.x-start.x)*between(0.05,0.4) + w*between(-0.18,0.18)), y: start.y + dy*between(0.14,0.38))
            let c2 = CGPoint(x: clamp(end.x + w*between(-0.25,0.25)), y: start.y + dy*between(0.62,0.9))
            let rotation = HomeGeometry.rotations[i] + (random() < 0.5 ? -1 : 1) * between(35,95)
            let speed = between(0.35,0.6), duration = between(960,1120).rounded() / 1000
            return HomeFall(curve: HomeCubic(start: start,c1: c1,c2: c2,end: end), rotation: rotation, duration: duration, initialSpeed: speed)
        }
    }
}
