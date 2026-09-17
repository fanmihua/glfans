import Foundation

/// Keep the website's document tree, so columns, paragraphs and inline runs retain
/// their boundaries when the mobile layout turns each grid into one column.
public final class ArticleNode: Identifiable {
    public let id:Int
    public let tag:String
    public let attributes:[String:String]
    public internal(set) var content:String
    public internal(set) var children:[ArticleNode]=[]
    init(id:Int,tag:String,attributes:[String:String]=[:],content:String="") {
        self.id=id;self.tag=tag;self.attributes=attributes;self.content=content
    }
    public var text:String {content + children.map(\.text).joined()}
    public func descendants(_ tag:String)->[ArticleNode] {children.flatMap{($0.tag==tag ? [$0]:[]) + $0.descendants(tag)}}
    public var meaningful:Bool {
        if ["title","bitable","del","s","strike"].contains(tag) {return false}
        return tag=="img" ? attributes["href"] != nil:!content.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty || children.contains(where:\.meaningful)
    }
}
public final class ArticleDocumentParser:NSObject,XMLParserDelegate {
    private let root=ArticleNode(id:0,tag:"root")
    private var stack:[ArticleNode]=[]
    private var counter=0
    public static func parse(_ xml:String)->ArticleNode? {
        let delegate=ArticleDocumentParser();delegate.stack=[delegate.root]
        let parser=XMLParser(data:Data(("<doc>"+xml+"</doc>").utf8))
        parser.shouldResolveExternalEntities=false;parser.delegate=delegate
        guard parser.parse() else{return nil};return delegate.root.children.first
    }
    public func parser(_ parser:XMLParser,didStartElement elementName:String,namespaceURI:String?,qualifiedName:String?,attributes:[String:String]) {
        counter+=1;let node=ArticleNode(id:counter,tag:elementName.lowercased(),attributes:attributes)
        stack.last?.children.append(node);stack.append(node)
    }
    public func parser(_ parser:XMLParser,foundCharacters string:String) {
        if let last=stack.last?.children.last,last.tag=="#text" {last.content+=string}
        else {counter+=1;stack.last?.children.append(ArticleNode(id:counter,tag:"#text",content:string))}
    }
    public func parser(_ parser:XMLParser,didEndElement elementName:String,namespaceURI:String?,qualifiedName:String?) {stack.removeLast()}
}
