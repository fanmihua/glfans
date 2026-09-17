import SwiftUI
import GlfansCore

struct ArticleView:View {
    @EnvironmentObject var app:AppModel
    @Environment(\.dismiss) var dismiss
    @Environment(\.sourceViewport) var viewport
    @Environment(\.sourceBottomInset) var bottom
    let collection:RepoCollection
    let article:RepoArticle
    @State private var progress:CGFloat=0
    @State private var nextArticle:RepoArticle?
    var subject:String {app.locale=="zh" ? article.displayTitle ?? article.title:app.t(article.title)}
    var number:String {String(format:"%02d",(collection.visibleArticles.firstIndex(where:{$0.id==article.id}) ?? 0)+1)}
    var next:RepoArticle? {
        guard let i=collection.visibleArticles.firstIndex(where:{$0.id==article.id}),collection.visibleArticles.indices.contains(i+1) else{return nil}
        return collection.visibleArticles[i+1]
    }
    var body:some View {
        ScrollView {
            LazyVStack(spacing:0,pinnedViews:[.sectionHeaders]) {
                Section {
                    VStack(alignment:.leading,spacing:0) {
                        masthead.padding(.horizontal,20)
                        if app.locale != "zh" {Text(app.t("全文译文说明")).sourceFont(11).foregroundStyle(.secondary).padding(.horizontal,20).padding(.bottom,20)}
                        ArticleBody(xml:article.xml,hideLeadHeading:true).padding(.horizontal,20).padding(.bottom,28)
                        if let next {
                            VStack(alignment:.leading,spacing:10) {
                                Text(app.t("NEXT ARTICLE")).sourceFont(10,weight:750).tracking(1.4).foregroundStyle(Pit.pink)
                                Button {nextArticle=next} label:{
                                    HStack(spacing:12) {
                                        Text(app.t("下一篇")).sourceFont(11)
                                        Text(app.locale=="zh" ? next.displayTitle ?? next.title:app.t(next.title)).sourceFont(18,family:"RobotoCondensed-Regular",weight:700).frame(maxWidth:.infinity,alignment:.leading)
                                        SourceIcon("ArrowRight",size:22).foregroundStyle(Pit.pink)
                                    }.frame(minHeight:44)
                                }.buttonStyle(SourceButtonStyle()).accessibilityIdentifier("article-next")
                            }.padding(.vertical,20).padding(.horizontal,20)
                        }
                    }.background(GeometryReader {g in
                        Color.clear.preference(key:ArticleReadPosition.self,value:[g.frame(in:.named("article-scroll")).minY,g.size.height])
                    }).padding(.bottom,90+bottom)
                } header:{readingBar}
            }
        }.coordinateSpace(name:"article-scroll").padding(.top,46)
            .onPreferenceChange(ArticleReadPosition.self) {values in
                if values.count==2 {progress=min(1,max(0,(44-values[0])/max(1,values[1]-(viewport.height-90))))}
            }
            .background(Pit.paper).toolbar(.hidden,for:.navigationBar)
            .navigationDestination(item:$nextArticle) {value in ArticleView(collection:collection,article:value)}
    }
    var readingBar:some View {
        HStack(spacing:8) {
            Button {dismiss()} label:{SourceIcon("ArrowLeft",size:20).frame(width:44,height:44)}.buttonStyle(SourceButtonStyle()).accessibilityLabel(app.t("返回全部合集")).accessibilityIdentifier("article-back")
            Text(subject).sourceFont(11,weight:700).tracking(0.44).foregroundStyle(Pit.pink).lineLimit(1).frame(maxWidth:.infinity,alignment:.leading)
            if app.locale=="zh" {Text(app.t("阅读进度 ")+String(Int((progress*100).rounded()))+"%").sourceFont(9).tracking(0.36)}
        }.padding(.leading,8).padding(.trailing,16).frame(height:44).background(Pit.paper)
            .overlay(alignment:.bottom){GeometryReader {g in Rectangle().fill(Pit.pink).frame(width:g.size.width*max(0.012,progress),height:2)}.frame(height:2)}
    }
    var masthead:some View {
        VStack(alignment:.leading,spacing:0) {
            Text(app.t("ARTICLE / ")+number).sourceFont(8,weight:750).tracking(1).padding(.horizontal,8).padding(.vertical,6).background(Pit.ink).foregroundStyle(.white)
            Text(app.t(collection.title)).sourceFont(app.locale=="zh" ? 22:20,family:"RobotoCondensed-Regular",weight:700).tracking(-0.55).padding(.top,14)
            Text(subject).sourceFont(min(36,max(28,viewport.width*0.075)),family:"RobotoCondensed-Regular",weight:700).tracking(-0.7).foregroundStyle(Pit.pink).lineSpacing(3).fixedSize(horizontal:false,vertical:true).padding(.top,8)
            SourceTexture("assets/repo-handdrawn-underline-pink.webp").frame(height:12).padding(.top,10)
        }.frame(maxWidth:.infinity,alignment:.leading).padding(.top,24).padding(.bottom,20)
            .accessibilityIdentifier("article-masthead")
    }
}
private struct ArticleReadPosition:PreferenceKey {
    static let defaultValue:[CGFloat]=[]
    static func reduce(value:inout [CGFloat],nextValue:()->[CGFloat]) {value=nextValue()}
}

struct ArticleBody:View {
    @EnvironmentObject var app:AppModel
    let xml:String
    var hideLeadHeading=false
    @State private var document:ArticleNode?
    @State private var picture:PictureSelection?
    var body:some View {
        VStack(alignment:.leading,spacing:0) {
            if let document {
                let children=document.children.filter{$0.meaningful}
                let firstHeading=hideLeadHeading ? children.first(where:{$0.tag=="h1"})?.id:nil
                ForEach(children.filter{$0.id != firstHeading}) {node in
                    if node.tag=="grid" {
                        NativeArticleNode(node:node,picture:$picture).padding(.top,22)
                            .overlay(alignment:.topLeading) {Text("CUT / " + String(format:"%02d",(children.filter{$0.tag=="grid"}.firstIndex(where:{$0.id==node.id}) ?? 0)+1)).sourceFont(8,weight:700).tracking(1.36).foregroundStyle(Pit.pink)}
                            .padding(.bottom,32)
                    } else {NativeArticleNode(node:node,picture:$picture)}
                }
            } else {Text(app.t("文章暂时无法读取")).sourceFont(14).padding(.vertical,24)}
        }.frame(maxWidth:.infinity,alignment:.leading)
            .onAppear {document=ArticleDocumentParser.parse(xml)}
            .onChange(of:xml) {_,value in document=ArticleDocumentParser.parse(value)}
            .sheet(item:$picture) {PictureViewer(source:$0.source)}
    }
}
struct NativeArticleNode:View {
    @EnvironmentObject var app:AppModel
    let node:ArticleNode
    @Binding var picture:PictureSelection?
    var noTranslate=false
    var text:String {node.text.trimmingCharacters(in:.whitespacesAndNewlines)}
    var speaker:Bool {node.tag=="p" && text.range(of:"^[\\p{L}\\p{N}.'’·_\\-\\s]{1,24}[：:]$",options:.regularExpression) != nil}
    var body:some View {render}
    @ViewBuilder var render:some View {
        switch node.tag {
        case "title","bitable","del","s","strike":EmptyView()
        case "#text":
            if !text.isEmpty {Text(noTranslate ? node.content:app.t(node.content)).sourceFont(16,weight:400)}
        case "grid":
            VStack(alignment:.leading,spacing:18) {
                ForEach(node.children.filter{$0.tag=="column" && $0.meaningful}) {child in
                    NativeArticleNode(node:child,picture:$picture,noTranslate:noTranslate)
                }
            }.frame(maxWidth:.infinity,alignment:.leading)
        case "p":
            if text.isEmpty {Color.clear.frame(height:8)}
            else if speaker {
                inline.sourceFont(13,family:"RobotoCondensed-Regular",weight:700).tracking(0.715).padding(.horizontal,8).padding(.vertical,6).background(Pit.pink.opacity(0.2)).padding(.bottom,12)
            } else {
                inline.sourceFont(16,weight:400).tracking(0.288).lineSpacing(6.8).fixedSize(horizontal:false,vertical:true).frame(maxWidth:.infinity,alignment:.leading).textSelection(.enabled).padding(.bottom,16)
            }
        case "h1","h2","h3":
            inline.sourceFont(node.tag=="h3" ? 19:22,family:"RobotoCondensed-Regular",weight:700).lineSpacing(4).fixedSize(horizontal:false,vertical:true).padding(.bottom,16)
        case "img":
            if let source=node.attributes["href"] {
                Button {picture=PictureSelection(source:source)} label:{
                    LocalArtwork(source: source).frame(maxWidth:.infinity).saturation(0).contrast(1.08)
                }.buttonStyle(SourceButtonStyle()).accessibilityLabel(app.t("文章配图")).padding(.bottom,12)
            }
        case "blockquote","quote":
            children(noTranslate:true).padding(.leading,16).padding(.vertical,4).overlay(alignment:.leading){Rectangle().fill(Pit.pink).frame(width:3)}.padding(.vertical,24)
        case "callout":
            HStack(alignment:.top,spacing:10) {Text(node.attributes["emoji"] ?? "");children(noTranslate:noTranslate)}
                .padding(14).background(Color(css:node.attributes["background-color"] ?? "#eeeee9")).padding(.vertical,20)
        case "ul","ol":
            VStack(alignment:.leading,spacing:8) {
                ForEach(Array(node.children.filter{$0.tag=="li"}.enumerated()),id:\.element.id) {i,child in
                    HStack(alignment:.top,spacing:8){Text(node.tag=="ol" ? "\(i+1).":"•");NativeArticleNode(node:child,picture:$picture,noTranslate:noTranslate)}
                }
            }.sourceFont(16).lineSpacing(6.8).padding(.bottom,16)
        case "hr":Rectangle().fill(Pit.ink.opacity(0.25)).frame(height:1).padding(.vertical,24)
        case "table":
            ScrollView(.horizontal) {VStack(alignment:.leading,spacing:0) {ForEach(node.descendants("tr")) {row in HStack(alignment:.top,spacing:0) {ForEach(row.children.filter{["td","th"].contains($0.tag)}) {cell in
                NativeArticleNode(node:cell,picture:$picture,noTranslate:noTranslate).frame(minWidth:100,maxWidth:240,alignment:.leading).padding(10).overlay(Rectangle().stroke(Pit.ink.opacity(0.2),lineWidth:1))
            }}}}}
        case "a","b","strong","i","em","u","span","li","td","th":
            inline.sourceFont(16).lineSpacing(6.8).fixedSize(horizontal:false,vertical:true)
        default:children(noTranslate:noTranslate)
        }
    }
    func children(noTranslate:Bool)->AnyView {
        let nodes=node.children.filter { $0.tag != "#text" || !$0.content.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty }
        return AnyView(VStack(alignment:.leading,spacing:0) {
            ForEach(Array(nodes.enumerated()),id:\.element.id) {i,child in
                if !(child.tag=="p" && child.text.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty && (i==0 || i==nodes.count-1)) {
                    NativeArticleNode(node:child,picture:$picture,noTranslate:noTranslate)
                }
            }
        }.frame(maxWidth:.infinity,alignment:.leading))
    }
    var inline:Text {Text(attributed(node,preserve:noTranslate || speaker || ["quote","blockquote"].contains(node.tag)))}
    func attributed(_ value:ArticleNode,preserve:Bool)->AttributedString {
        if ["del","s","strike","bitable"].contains(value.tag) {return AttributedString()}
        if value.tag=="br" {return AttributedString("\n")}
        var result=AttributedString(value.tag=="#text" ? (preserve ? value.content:app.t(value.content)):"")
        for child in value.children {result.append(attributed(child,preserve:preserve || ["quote","blockquote"].contains(value.tag)))}
        switch value.tag {
        case "b","strong":result.inlinePresentationIntent = .stronglyEmphasized
        case "i","em":result.inlinePresentationIntent = .emphasized
        case "u":result.underlineStyle = .single
        case "a":if let href=value.attributes["href"],let url=URL(string:href),["http","https","mailto"].contains(url.scheme) {result.link=url;result.foregroundColor=Pit.pink}
        case "span":if let color=value.attributes["text-color"] {result.foregroundColor=Color(css:color)}
        default:break
        }
        return result
    }
}
extension Color {
    init(css:String) {
        let hex=css.trimmingCharacters(in:CharacterSet(charactersIn:"#"))
        if let v=UInt(hex,radix:16),hex.count==6 {self.init(red:Double((v>>16)&255)/255,green:Double((v>>8)&255)/255,blue:Double(v&255)/255)}
        else {self=Pit.ink}
    }
}
struct PictureSelection:Identifiable {let source:String;var id:String{source}}
struct PictureViewer:View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var app:AppModel
    let source:String
    var body:some View {
        NavigationStack {
            LoadedArtwork(source: source) { image in
                if let image { ZoomablePicture(image: image) }
                else { ProgressView().tint(.white).frame(maxWidth: .infinity, maxHeight: .infinity) }
            }.ignoresSafeArea(.container,edges:.bottom).background(.black)
                .toolbar {ToolbarItem(placement:.confirmationAction){Button(app.t("完成")){dismiss()}}}
        }
    }
}
struct ZoomablePicture:UIViewRepresentable {
    let image: UIImage
    func makeCoordinator()->Coordinator {Coordinator()}
    func makeUIView(context:Context)->UIScrollView {
        let scroll=UIScrollView();scroll.minimumZoomScale=1;scroll.maximumZoomScale=4;scroll.delegate=context.coordinator
        scroll.backgroundColor = .black;scroll.showsHorizontalScrollIndicator=false;scroll.showsVerticalScrollIndicator=false
        let image=UIImageView(image: self.image);image.contentMode = .scaleAspectFit;image.isUserInteractionEnabled=true
        scroll.addSubview(image);context.coordinator.image=image
        let tap=UITapGestureRecognizer(target:context.coordinator,action:#selector(Coordinator.doubleTap(_:)));tap.numberOfTapsRequired=2;scroll.addGestureRecognizer(tap)
        return scroll
    }
    func updateUIView(_ scroll:UIScrollView,context:Context) { context.coordinator.image?.image = image; DispatchQueue.main.async {if scroll.zoomScale==1 {context.coordinator.image?.frame=scroll.bounds;scroll.contentSize=scroll.bounds.size}}}
    final class Coordinator:NSObject,UIScrollViewDelegate {
        var image:UIImageView?
        func viewForZooming(in scrollView:UIScrollView)->UIView? {image}
        @objc func doubleTap(_ gesture:UITapGestureRecognizer) {
            guard let scroll=gesture.view as? UIScrollView else{return}
            if scroll.zoomScale>1 {scroll.setZoomScale(1,animated:true)}
            else {let p=gesture.location(in:image);scroll.zoom(to:CGRect(x:p.x-scroll.bounds.width/4,y:p.y-scroll.bounds.height/4,width:scroll.bounds.width/2,height:scroll.bounds.height/2),animated:true)}
        }
    }
}
