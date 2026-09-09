// Generated from @phosphor-icons/react, bold, 256x256. Do not redraw.
import SwiftUI
enum HomeSourceIcon {
    static var arrowDown: Path {
        var p = Path()
        p.move(to: .init(x: 208.49000000, y: 152.49000000))
        p.addLine(to: .init(x: 136.49000000, y: 224.49000000))
        p.addCurve(to: .init(x: 127.99000000, y: 228.01946283), control1: .init(x: 134.23837753, y: 226.74945422), control2: .init(x: 131.17981773, y: 228.01946283))
        p.addCurve(to: .init(x: 119.49000000, y: 224.49000000), control1: .init(x: 124.80018227, y: 228.01946283), control2: .init(x: 121.74162247, y: 226.74945422))
        p.addLine(to: .init(x: 47.49000000, y: 152.49000000))
        p.addCurve(to: .init(x: 47.49000018, y: 135.49000018), control1: .init(x: 42.79557980, y: 147.79557960), control2: .init(x: 42.79557988, y: 140.18442048))
        p.addCurve(to: .init(x: 64.49000000, y: 135.49000000), control1: .init(x: 52.18442048, y: 130.79557988), control2: .init(x: 59.79557960, y: 130.79557980))
        p.addLine(to: .init(x: 116.00000000, y: 187.00000000))
        p.addLine(to: .init(x: 116.00000000, y: 40.00000000))
        p.addCurve(to: .init(x: 128.00000000, y: 28.00000000), control1: .init(x: 116.00000000, y: 33.37258300), control2: .init(x: 121.37258300, y: 28.00000000))
        p.addCurve(to: .init(x: 140.00000000, y: 40.00000000), control1: .init(x: 134.62741700, y: 28.00000000), control2: .init(x: 140.00000000, y: 33.37258300))
        p.addLine(to: .init(x: 140.00000000, y: 187.00000000))
        p.addLine(to: .init(x: 191.51000000, y: 135.48000000))
        p.addCurve(to: .init(x: 208.51000000, y: 135.48000000), control1: .init(x: 196.20442037, y: 130.78557963), control2: .init(x: 203.81557963, y: 130.78557963))
        p.addCurve(to: .init(x: 208.51000000, y: 152.48000000), control1: .init(x: 213.20442037, y: 140.17442037), control2: .init(x: 213.20442037, y: 147.78557963))
        p.addLine(to: .init(x: 208.49000000, y: 152.49000000))
        p.closeSubpath()
        return p
    }
    static var arrowRight: Path {
        var p = Path()
        p.move(to: .init(x: 224.49000000, y: 136.49000000))
        p.addLine(to: .init(x: 152.49000000, y: 208.49000000))
        p.addCurve(to: .init(x: 135.49000034, y: 208.48999966), control1: .init(x: 147.79557957, y: 213.18442006), control2: .init(x: 140.18442058, y: 213.18441991))
        p.addCurve(to: .init(x: 135.49000000, y: 191.49000000), control1: .init(x: 130.79558009, y: 203.79557942), control2: .init(x: 130.79557994, y: 196.18442043))
        p.addLine(to: .init(x: 187.00000000, y: 140.00000000))
        p.addLine(to: .init(x: 40.00000000, y: 140.00000000))
        p.addCurve(to: .init(x: 28.00000000, y: 128.00000000), control1: .init(x: 33.37258300, y: 140.00000000), control2: .init(x: 28.00000000, y: 134.62741700))
        p.addCurve(to: .init(x: 40.00000000, y: 116.00000000), control1: .init(x: 28.00000000, y: 121.37258300), control2: .init(x: 33.37258300, y: 116.00000000))
        p.addLine(to: .init(x: 187.00000000, y: 116.00000000))
        p.addLine(to: .init(x: 135.51000000, y: 64.48000000))
        p.addCurve(to: .init(x: 135.51000018, y: 47.48000018), control1: .init(x: 130.81557980, y: 59.78557960), control2: .init(x: 130.81557988, y: 52.17442048))
        p.addCurve(to: .init(x: 152.51000000, y: 47.48000000), control1: .init(x: 140.20442048, y: 42.78557988), control2: .init(x: 147.81557960, y: 42.78557980))
        p.addLine(to: .init(x: 224.51000000, y: 119.48000000))
        p.addCurve(to: .init(x: 228.03448664, y: 127.98915578), control1: .init(x: 226.76987801, y: 121.73467955), control2: .init(x: 228.03824005, y: 124.79688160))
        p.addCurve(to: .init(x: 224.49000000, y: 136.49000000), control1: .init(x: 228.03073324, y: 131.18142995), control2: .init(x: 226.75517376, y: 134.24064091))
        p.closeSubpath()
        return p
    }
}
struct SourceArrow: View {
    var down = false
    var body: some View {
        GeometryReader { g in
            (down ? HomeSourceIcon.arrowDown : HomeSourceIcon.arrowRight)
                .applying(.init(scaleX: g.size.width / 256, y: g.size.height / 256)).fill()
        }.accessibilityHidden(true)
    }
}
