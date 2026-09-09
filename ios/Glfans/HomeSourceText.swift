import SwiftUI
import CoreText

/// CSS line boxes drawn by CoreText, using the website font files. Unlike a
/// SwiftUI system Text, this preserves CSS line-height and trailing letter spacing.
struct SourceLine: View {
    let text: String
    let size: CGFloat
    var family = "Manrope-ExtraLight"
    var weight: CGFloat = 400
    var kern: CGFloat = 0
    var lineHeight: CGFloat? = nil
    var color: UIColor = UIColor(Pit.ink)

    var font: UIFont { Self.font(family, size: size, weight: weight) }
    static func font(_ family: String, size: CGFloat, weight: CGFloat) -> UIFont {
        let font = UIFont(name: family, size: size) ?? UIFont.systemFont(ofSize: size)
        // OpenType 'wght', preserves the real variable font instead of synthetic bold.
        let descriptor = font.fontDescriptor.addingAttributes([
            kCTFontVariationAttribute as UIFontDescriptor.AttributeName: [NSNumber(value: 0x77676874): weight]
        ])
        return UIFont(descriptor: descriptor, size: size)
    }
    var attributed: NSAttributedString {
        NSAttributedString(string: text, attributes: [.font: font, .kern: kern, .foregroundColor: color])
    }
    var width: CGFloat { CGFloat(CTLineGetTypographicBounds(CTLineCreateWithAttributedString(attributed), nil, nil, nil)) }
    var height: CGFloat { lineHeight ?? font.lineHeight }
    var body: some View {
        SourceGlyphRepresentable(source:self)
            .frame(width:width+size*2,height:height+size*2)
            .frame(width:width,height:height)
            .accessibilityElement(children:.ignore).accessibilityLabel(text).accessibilityAddTraits(.isStaticText)
    }
}
private struct SourceGlyphRepresentable: UIViewRepresentable {
    let source: SourceLine
    func makeUIView(context:Context)->SourceGlyphView { SourceGlyphView() }
    func updateUIView(_ view:SourceGlyphView,context:Context) { view.source=source;view.setNeedsDisplay() }
}
final class SourceGlyphView: UIView {
    var source: SourceLine?
    override init(frame: CGRect) { super.init(frame:frame); backgroundColor = .clear; isOpaque = false; isUserInteractionEnabled = false }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    override func draw(_ rect: CGRect) {
        guard let s = source, let c = UIGraphicsGetCurrentContext() else { return }
        let line = CTLineCreateWithAttributedString(s.attributed)
        var a: CGFloat = 0, d: CGFloat = 0, leading: CGFloat = 0
        CTLineGetTypographicBounds(line, &a, &d, &leading)
        let baseline = (s.height - a - d) / 2 + a
        c.textMatrix = .identity; c.translateBy(x:s.size,y:baseline+s.size); c.scaleBy(x:1,y:-1)
        c.textPosition = .zero; CTLineDraw(line,c)
    }
}

/// CSS shrink-to-fit paragraphs retain native text accessibility and line breaking.
struct SourceParagraph: View {
    let source: SourceLine
    let maxWidth: CGFloat
    private var lines: [String] {
        let typesetter = CTTypesetterCreateWithAttributedString(source.attributed)
        let text = source.text as NSString
        var result: [String] = [], start = 0
        while start < text.length {
            let count = max(1,CTTypesetterSuggestLineBreak(typesetter,start,Double(maxWidth)))
            result.append(text.substring(with:NSRange(location:start,length:count)))
            start += count
        }
        return result
    }
    var body: some View {
        VStack(alignment:.leading,spacing:0) {
            ForEach(Array(lines.enumerated()),id:\.offset) { _, text in
                SourceLine(text:text,size:source.size,family:source.family,weight:source.weight,kern:source.kern,lineHeight:source.lineHeight,color:source.color)
            }
        }.frame(width:min(source.width,maxWidth),alignment:.leading)
            .accessibilityElement(children:.ignore).accessibilityLabel(source.text).accessibilityAddTraits(.isStaticText)
    }
}
