import SwiftUI

/// Original 256 × 256 Phosphor paths from the website, converted at build-source time.
struct SourceIcon: View {
    let name: String
    var weight = "regular"
    var size: CGFloat = 24
    init(_ name: String, weight: String = "regular", size: CGFloat = 24) {
        self.name = name; self.weight = weight; self.size = size
    }
    private static let paths: [String: Path] = {
        guard let url = Bundle.main.url(forResource: "SourceIcons", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let icons = try? JSONDecoder().decode([String: [[Double]]].self, from: data) else { return [:] }
        return icons.mapValues { commands in
            var path = Path()
            for c in commands {
                switch c[0] {
                case 0: path.move(to: CGPoint(x: c[1], y: c[2]))
                case 1: path.addLine(to: CGPoint(x: c[1], y: c[2]))
                case 2: path.addCurve(to: CGPoint(x: c[5], y: c[6]), control1: CGPoint(x: c[1], y: c[2]), control2: CGPoint(x: c[3], y: c[4]))
                case 3: path.closeSubpath()
                case 4: path.addQuadCurve(to: CGPoint(x: c[3], y: c[4]), control: CGPoint(x: c[1], y: c[2]))
                default: break
                }
            }
            return path
        }
    }()
    var body: some View {
        (Self.paths["\(name)-\(weight)"] ?? Path())
            .applying(.init(scaleX: size / 256, y: size / 256))
            .fill().frame(width: size, height: size).accessibilityHidden(true)
    }
}

/// CSS background-size: 100% 100%, without SwiftUI's implicit aspect fit.
struct SourceTexture: View {
    let source: String
    init(_ source: String) { self.source = source }
    var body: some View {
        LoadedArtwork(source: source) { image in
            if let image { Image(uiImage: image).resizable() }
        }
    }
}

extension View {
    func sourceFont(_ size: CGFloat, family: String = "Manrope-ExtraLight", weight: CGFloat = 500) -> some View {
        modifier(SourceFontModifier(size:size,family:family,weight:weight))
    }
}

private struct SourceFontModifier:ViewModifier {
    @Environment(\.locale) var locale
    let size:CGFloat;let family:String;let weight:CGFloat
    func body(content:Content)->some View {
        let resolved=locale.language.languageCode?.identifier=="th" && ["Manrope-ExtraLight","RobotoCondensed-Regular","RobotoCondensed-Black","AlibabaPuHuiTi-Heavy"].contains(family) ? "NotoSansThai-Regular":family
        content.font(Font(SourceLine.font(resolved,size:size,weight:weight)))
    }
}

/// CSS object-fit: cover and object-position, retaining the source focal point.
struct SourcePhoto: View {
    let source: String
    var focus = "50% 40%"
    var body: some View {
        LoadedArtwork(source: source) { image in
            GeometryReader { g in
            if let image {
                let parts = focus.split(separator: " ").compactMap { Double($0.replacingOccurrences(of: "%", with: "")) }
                let x = CGFloat(parts.first ?? 50) / 100
                let y = CGFloat(parts.count > 1 ? parts[1] : 40) / 100
                let scale = max(g.size.width / image.size.width, g.size.height / image.size.height)
                let w = image.size.width * scale, h = image.size.height * scale
                Image(uiImage: image).resizable().frame(width: w, height: h)
                    .position(x: w / 2 + (g.size.width - w) * x, y: h / 2 + (g.size.height - h) * y)
            }
            }.clipped()
        }
    }
}
