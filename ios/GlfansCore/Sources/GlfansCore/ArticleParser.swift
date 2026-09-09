import Foundation

public struct ArticleRun: Equatable, Sendable {
    public var text: String
    public var bold: Bool = false
    public var italic: Bool = false
    public var underline: Bool = false
    public var link: String?
    public var color: String?
}
public struct ArticleBlock: Identifiable, Equatable, Sendable {
    public enum Kind: String, Sendable { case paragraph, heading, quote, image, rule, listItem, callout }
    public let id: Int
    public let kind: Kind
    public var runs: [ArticleRun] = []
    public var source: String?
    public var alt: String?
    public var imageWidth: Double?
    public var imageHeight: Double?
    public var level: Int = 0
    public var text: String { runs.map(\.text).joined() }
}

/// 使用 XMLParser 将已有文章转换为原生块；保留图文顺序与链接，不渲染 WebView。
public final class ArticleParser: NSObject, XMLParserDelegate {
    private var blocks = [ArticleBlock]()
    private var runs = [ArticleRun]()
    private var elements = [(String, [String: String])]()
    private var skipDepth = 0
    private var currentKind = ArticleBlock.Kind.paragraph
    private var currentLevel = 0
    private var hideLeadHeading = false
    private var leadHeadingSkipped = false
    private var parsingError: Error?

    public static func parse(_ xml: String, hideLeadHeading: Bool = false) throws -> [ArticleBlock] {
        let delegate = ArticleParser()
        delegate.hideLeadHeading = hideLeadHeading
        let parser = XMLParser(data: Data(("<doc>" + xml + "</doc>").utf8))
        parser.shouldResolveExternalEntities = false
        parser.delegate = delegate
        guard parser.parse() else { throw parser.parserError ?? delegate.parsingError ?? CocoaError(.fileReadCorruptFile) }
        delegate.flush()
        return delegate.blocks
    }
    private func flush() {
        if !runs.map(\.text).joined().trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            blocks.append(ArticleBlock(id: blocks.count, kind: currentKind, runs: runs, level: currentLevel))
        }
        runs = []
    }
    public func parser(_ parser: XMLParser, didStartElement elementName: String, namespaceURI: String?, qualifiedName: String?, attributes: [String: String]) {
        let tag = elementName.lowercased()
        elements.append((tag, attributes))
        if skipDepth > 0 { skipDepth += 1; return }
        if ["title", "bitable", "del", "s", "strike"].contains(tag) || (tag == "h1" && hideLeadHeading && !leadHeadingSkipped) {
            if tag == "h1" { leadHeadingSkipped = true }
            skipDepth = 1; return
        }
        if tag == "img" {
            flush()
            if let source = attributes["href"], !source.isEmpty {
                blocks.append(ArticleBlock(id: blocks.count, kind: .image, source: source, alt: attributes["name"], imageWidth: Double(attributes["width"] ?? ""), imageHeight: Double(attributes["height"] ?? "")))
            }
        } else if tag == "hr" {
            flush(); blocks.append(ArticleBlock(id: blocks.count, kind: .rule))
        } else if tag == "br" { append("\n") }
        else if ["p", "h1", "h2", "h3", "blockquote", "quote", "li", "callout"].contains(tag) {
            flush()
            currentKind = tag.hasPrefix("h") ? .heading : ["blockquote", "quote"].contains(tag) ? .quote : tag == "li" ? .listItem : tag == "callout" ? .callout : .paragraph
            currentLevel = Int(tag.dropFirst()) ?? 0
        }
    }
    private func append(_ text: String) {
        let tags = elements.map(\.0)
        let run = ArticleRun(text: text, bold: tags.contains("b") || tags.contains("strong"), italic: tags.contains("i") || tags.contains("em"), underline: tags.contains("u"), link: elements.last(where: { $0.0 == "a" })?.1["href"], color: elements.last(where: { $0.0 == "span" })?.1["text-color"])
        runs.append(run)
    }
    public func parser(_ parser: XMLParser, foundCharacters string: String) { if skipDepth == 0 { append(string) } }
    public func parser(_ parser: XMLParser, didEndElement elementName: String, namespaceURI: String?, qualifiedName: String?) {
        defer { if !elements.isEmpty { elements.removeLast() } }
        if skipDepth > 0 { skipDepth -= 1; return }
        let tag = elementName.lowercased()
        if ["p", "h1", "h2", "h3", "blockquote", "quote", "li", "callout", "column", "grid", "tr"].contains(tag) {
            flush(); currentKind = .paragraph; currentLevel = 0
        } else if tag == "td" || tag == "th" { append("　") }
    }
    public func parser(_ parser: XMLParser, parseErrorOccurred parseError: Error) { parsingError = parseError }
}
