import SwiftUI
import GlfansCore

struct CommentTarget: Identifiable { let type:String; let id:String; let title:String; var speaker:String = "" }

struct LiteratureView: View {
    @EnvironmentObject var app:AppModel
    @EnvironmentObject var community:CommunityStore
    @Environment(\.sourceViewport) var viewport
    @Environment(\.sourceBottomInset) var bottom
    let catalog:Catalog
    @State private var target:CommentTarget?
    @State private var safetyTarget:SafetyTarget?
    @State private var publishing=false
    @State private var didPublish=false
    @State private var sort="最新"
    @AppStorage("glfans.hiddenQuotes") private var hidden=""
    var quotes:[Quote] {
        let all=community.quotesLoaded ? community.quotes:catalog.quotes
        let hiddenIDs=Set(hidden.components(separatedBy:"|"))
        return all.filter{!hiddenIDs.contains($0.id) && !community.isBlocked($0.author_key)}.sorted {a,b in
            if (a.is_pinned ?? false) != (b.is_pinned ?? false) {return a.is_pinned == true}
            if a.is_pinned == true {return (a.sort_order ?? 0)<(b.sort_order ?? 0)}
            let x=community.stats["quote:"+a.id],y=community.stats["quote:"+b.id]
            if sort=="心动", (x?.reaction_count ?? 0) != (y?.reaction_count ?? 0) {return (x?.reaction_count ?? 0)>(y?.reaction_count ?? 0)}
            if sort=="回声", (x?.comment_count ?? 0) != (y?.comment_count ?? 0) {return (x?.comment_count ?? 0)>(y?.comment_count ?? 0)}
            if (a.created_at ?? "") != (b.created_at ?? "") {return (a.created_at ?? "")>(b.created_at ?? "")}
            return (all.firstIndex(of:a) ?? 0)<(all.firstIndex(of:b) ?? 0)
        }
    }
    var body:some View {
        ScrollViewReader {proxy in
            ScrollView {
                LazyVStack(spacing:0,pinnedViews:[.sectionHeaders]) {
                    hero
                    stats.padding(.horizontal,16)
                    Section {
                        VStack(spacing:12) {
                            ForEach(quotes.filter{$0.is_pinned == true}) {quote in card(quote)}
                            let regular=quotes.filter{$0.is_pinned != true}
                            HStack(alignment:.top,spacing:12) {
                                ForEach(0..<2) {column in
                                    LazyVStack(spacing:12) {
                                        ForEach(Array(regular.enumerated()).filter{$0.offset % 2 == column},id:\.element.id) {_,quote in card(quote)}
                                    }.frame(maxWidth:.infinity)
                                }
                            }
                        }.padding(.horizontal,16).padding(.top,8).padding(.bottom,90+bottom)
                        if let message=community.message {
                            HStack {Text(app.t(message)).sourceFont(11);Button(app.t("重试")) {Task{await community.load(force:true)}}}.padding()
                        }
                    } header:{toolbar.id("quotes")}
                }
            }.padding(.top,46).background(Pit.paper)
                .task {await community.load();await community.recordView(type:"page",id:"tide-words")}
                .refreshable {await community.load(force:true)}
                .fullScreenCover(item:$target) {CommentsSheet(target:$0)}
                .fullScreenCover(item:$safetyTarget) {CommunitySafetySheet(target:$0)}
                .fullScreenCover(isPresented:$publishing,onDismiss:{
                    if didPublish {sort="最新";proxy.scrollTo("quotes",anchor:.top);didPublish=false}
                }) {PublishQuoteSheet(onPublished:{didPublish=true})}
        }
    }
    var hero:some View {
        VStack(spacing:8) {
            ZStack(alignment:.topLeading) {
                let s=min(84,max(56,viewport.width*0.17)),pink=min(86,max(58,viewport.width*0.175))
                if app.locale=="zh" {
                    HStack(alignment:.firstTextBaseline,spacing:2) {
                        titlePair("坑底",size:s,pink:false)
                        titlePair("文学",size:pink,pink:true)
                    }.offset(y:24)
                } else {
                    HStack(alignment:.firstTextBaseline,spacing:10) {
                        Text(app.locale=="en" ? "Voices":"เสียง").sourceFont(min(62,max(37,viewport.width*0.11)),family:app.locale=="en" ? "RobotoCondensed-Black":"NotoSansThai-Regular",weight:900)
                        Text(app.locale=="en" ? "from the pit":"จากด้อม").sourceFont(min(40,max(24,viewport.width*0.068)),family:app.locale=="en" ? "RobotoCondensed-Black":"NotoSansThai-Regular",weight:900).foregroundStyle(Pit.pink)
                    }.rotationEffect(.degrees(-2)).offset(y:8)
                }
                SourceIcon("Heart",size:20).foregroundStyle(Pit.pink).rotationEffect(.degrees(-18)).offset(x:s*1.82)
                SourceIcon("Heart",size:22).foregroundStyle(Pit.pink).rotationEffect(.degrees(9)).offset(x:2,y:106)
                Text(app.t("WORDS / FREQUENCY / TIDE")).sourceFont(9,weight:750).tracking(0.99)
                    .padding(.horizontal,8).padding(.top,5).padding(.bottom,4).background(Pit.ink).foregroundStyle(.white).rotationEffect(.degrees(-3))
                    .frame(maxWidth:.infinity,maxHeight:.infinity,alignment:.bottomTrailing).offset(x:-6,y:6)
            }.frame(height:128)
            FrequencyChart().padding(.top,28).padding(.trailing,4).padding(.bottom,14)
        }.padding(.horizontal,16).padding(.top,18).padding(.bottom,12).frame(height:304)
    }
    func titlePair(_ string:String,size:CGFloat,pink:Bool)->some View {
        HStack(alignment:.firstTextBaseline,spacing:0) {
            ForEach(Array(string.enumerated()),id:\.offset) {i,char in
                let scale:CGFloat=pink ? (i==0 ? 0.94:1.05):1
                SourceLine(text:String(char),size:size*scale,family:"AlibabaPuHuiTi-Heavy",weight:900,kern:-size*scale*0.11,lineHeight:size*scale*0.87,color:UIColor(pink ? Pit.pink:Pit.ink))
                    .rotationEffect(.degrees(pink ? (i==0 ? 2.5:-1.8):(i==0 ? -2.5:2)),anchor:.bottom)
                    .offset(y:size*(pink ? (i==0 ? 0.02:-0.025):(i==0 ? -0.035:0.035)))
            }
        }
    }
    var stats:some View {
        let ids=Set((community.quotesLoaded ? community.quotes:catalog.quotes).map(\.id))
        let values=community.stats.values.filter { $0.target_type=="page" && $0.target_id=="tide-words" || $0.target_type=="quote" && ids.contains($0.target_id) }
        let counts=[values.reduce(0){$0+$1.view_count},values.reduce(0){$0+$1.reaction_count},values.reduce(0){$0+$1.comment_count}]
        return HStack(spacing:0) {
            ForEach(0..<3) {i in
                HStack(alignment:.firstTextBaseline,spacing:6) {Text(app.t(["路过","心动","回声"][i])).sourceFont(11);Text(community.statsLoaded ? String(counts[i]):"—").sourceFont(12)}
                    .frame(width:64,alignment:.leading)
            }
            Spacer(minLength:0)
        }.foregroundStyle(Color(white:0.4)).padding(8).background(Color(red:238/255,green:238/255,blue:233/255))
    }
    var toolbar:some View {
        HStack(spacing:0) {
            ForEach(["最新","心动","回声"],id:\.self) {value in
                Button {sort=value} label: {
                    Text(app.t(value)).sourceFont(13,weight:sort==value ? 750:500).frame(width:48,height:44,alignment:.leading).padding(.horizontal,8)
                        .foregroundStyle(sort==value ? Pit.ink:Color(white:0.4))
                        .overlay(alignment:.bottomLeading) {if sort==value {Rectangle().fill(Pit.pink).frame(width:25,height:3).offset(x:8,y:-7)}}
                }.buttonStyle(SourceButtonStyle()).accessibilityIdentifier("quote-sort-"+value)
            }
            Spacer(minLength:0)
            Button {publishing=true} label:{HStack(spacing:5) {SourceIcon("PencilSimpleLine",weight:"bold",size:16).foregroundStyle(Pit.pink);Text(app.t("留一句")).sourceFont(13,weight:750)}.padding(.horizontal,8).frame(minHeight:44)}
                .buttonStyle(SourceButtonStyle()).accessibilityIdentifier("quote-compose")
        }.padding(.vertical,2).padding(.horizontal,16).background(Pit.paper)
    }
    func open(_ quote:Quote) {target=CommentTarget(type:"quote",id:quote.id,title:quote.text,speaker:quote.speaker)}
    func card(_ quote:Quote)->some View {
        let pinned=quote.is_pinned == true, text=app.t(quote.text)
        return VStack(alignment:.leading,spacing:0) {
            Button {open(quote)} label: {
                VStack(alignment:.leading,spacing:pinned ? 8:16) {
                    Text(text).sourceFont(text.count<=9 ? 16:14,weight:750).lineSpacing(3).fixedSize(horizontal:false,vertical:true).frame(maxWidth:.infinity,alignment:.leading)
                    Text("— " + (quote.speaker=="匿名坑底人" ? app.t(quote.speaker):quote.speaker)).sourceFont(10,weight:400).foregroundStyle(Color(white:0.4)).frame(maxWidth:.infinity,alignment:.leading)
                }.padding(.horizontal,12).padding(.top,pinned ? 32:20).padding(.bottom,4)
            }.buttonStyle(SourceButtonStyle()).accessibilityIdentifier("quote-"+quote.id)
            CommunityActions(type:"quote",id:quote.id,comments:{open(quote)},safety:{safetyTarget=SafetyTarget(type:"quote",id:quote.id,text:quote.text,canBlock:quote.author_key != nil)}).padding(.horizontal,6).padding(.bottom,pinned ? 0:4)
        }.frame(maxWidth:.infinity,alignment:.leading)
            .background(alignment:.topTrailing) {SourceIcon("Quotes",weight:"fill",size:64).foregroundStyle(Pit.ink.opacity(0.035)).rotationEffect(.degrees(-14)).offset(x:10,y:-12)}
            .background(pinned ? Color.white:Color.clear).clipped().overlay(Rectangle().stroke(Color(white:0.87),lineWidth:1))
            .overlay(alignment:.topTrailing) {if pinned {HStack(spacing:3) {SourceIcon("PushPin",weight:"fill",size:10);Text(app.t("站主置顶")).sourceFont(9)}.foregroundStyle(Color(white:0.4)).padding(7)}}
            .contextMenu {ShareLink(item:quote.text);Button(app.t("隐藏这条内容"),role:.destructive) {hidden += "|" + quote.id}}

    }
}

struct FrequencyChart:View {
    @EnvironmentObject var app:AppModel
    @Environment(\.accessibilityReduceMotion) var reduced
    @State private var shown=false
    var body:some View {
        GeometryReader {g in
            let words=WebsiteContent.shared?.frequencyWords ?? []
            let segments=WebsiteContent.shared?.frequencySegments ?? []
            let path=Path {p in
                if let first=segments.first {p.move(to:CGPoint(x:first.start.x,y:first.start.y))}
                for s in segments {p.addCurve(to:CGPoint(x:s.end.x,y:s.end.y),control1:CGPoint(x:s.control1.x,y:s.control1.y),control2:CGPoint(x:s.control2.x,y:s.control2.y))}
            }.applying(.init(scaleX:g.size.width/1060,y:g.size.height/400))
            ZStack(alignment:.topLeading) {
                Canvas {ctx,size in
                    var area=path;area.addLine(to:CGPoint(x:size.width,y:size.height));area.addLine(to:CGPoint(x:0,y:size.height));area.closeSubpath()
                    ctx.fill(area,with:.linearGradient(Gradient(stops:[.init(color:Pit.pink.opacity(0.26),location:0),.init(color:Pit.pink.opacity(0.13),location:0.35),.init(color:Pit.pink.opacity(0.035),location:0.7),.init(color:.clear,location:1)]),startPoint:CGPoint(x:0,y:size.height*0.18),endPoint:CGPoint(x:0,y:size.height*0.6)))
                    for word in words {
                        let x=word.x/106*size.width,y=word.y/100*size.height
                        ctx.stroke(Path {p in p.move(to:.init(x:x,y:y));p.addLine(to:.init(x:x,y:size.height*0.98))},with:.color(Pit.ink.opacity(0.09)),style:StrokeStyle(lineWidth:1,dash:[3,2]))
                    }
                }
                path.trimmedPath(from:0,to:shown ? 1:0).stroke(LinearGradient(stops:[.init(color:Pit.pink,location:0),.init(color:Pit.ink,location:250/1060),.init(color:Pit.ink,location:1)],startPoint:.leading,endPoint:.trailing),lineWidth:1.5)
                ForEach(Array(words.enumerated()),id:\.offset) {i,word in
                    let x=word.x/106*g.size.width,y=word.y/100*g.size.height
                    Circle().fill(Pit.paper).overlay(Circle().stroke(Pit.pink.opacity(0.58),lineWidth:2)).frame(width:8,height:8).shadow(color:Pit.pink.opacity(0.08),radius:0).position(x:x,y:y)
                    if i<5 {Text(app.t(word.name)).sourceFont(11,weight:750).fixedSize().rotationEffect(.degrees(word.tilt)).position(x:x,y:y-18)}
                }.opacity(shown ? 1:0)
            }
        }.onAppear {withAnimation(reduced ? nil:.linear(duration:1.1)){shown=true}}
            .accessibilityElement(children:.ignore).accessibilityLabel(app.t("词频实时演化图"))
    }
}

struct CommunityActions:View {
    @EnvironmentObject var app:AppModel
    @EnvironmentObject var community:CommunityStore
    let type:String;let id:String;let comments:()->Void
    var safety:(()->Void)? = nil
    var key:String {type+":"+id}
    var body:some View {
        HStack(spacing:2) {
            if let safety { Button(action:safety) {Text("⋯").sourceFont(18).frame(width:44,height:44)}.buttonStyle(SourceButtonStyle()).accessibilityLabel(app.t("举报与屏蔽")).accessibilityIdentifier("quote-safety-"+id) }
            Spacer(minLength:0)
            Button {Task{await community.react(type:type,id:id)}} label:{
                HStack(spacing:4) {SourceIcon("Heart",weight:community.reactions.contains(key) ? "fill":"regular",size:16);Text(community.stats[key].map{String($0.reaction_count)} ?? "—").sourceFont(10)}
                    .foregroundStyle(community.reactions.contains(key) ? Pit.pink:Pit.ink.opacity(0.3)).frame(minWidth:44,minHeight:44)
            }.buttonStyle(SourceButtonStyle()).disabled(!community.configured || community.busy.contains(key)).accessibilityLabel(app.t(community.reactions.contains(key) ? "取消心动":"送出心动"))
            Button(action:comments) {HStack(spacing:4) {SourceIcon("ChatCircleDots",size:16).foregroundStyle(Pit.pink);Text(community.stats[key].map{String($0.comment_count)} ?? "—").sourceFont(10).foregroundStyle(Color(white:0.4))}.frame(minWidth:44,minHeight:44)}
                .buttonStyle(SourceButtonStyle()).accessibilityLabel(app.t("评论"))
        }
    }
}

struct CommentsSheet:View {
    @EnvironmentObject var app:AppModel
    @EnvironmentObject var community:CommunityStore
    @Environment(\.dismiss) var dismiss
    let target:CommentTarget
    @Environment(\.sourceViewport) private var viewport
    @Environment(\.sourceBottomInset) private var bottom
    @State private var contentHeight:CGFloat=300
    @State private var comments:[CommunityComment]=[]
    @State private var safetyTarget:SafetyTarget?
    @State private var writing=false
    @State private var loading=true
    @State private var sending=false
    @State private var hasMore=false
    @State private var bodyText=""
    @AppStorage("glfans.nickname") private var nickname=""
    @State private var error:String?
    @FocusState private var focused:Bool
    var draftKey:String {"glfans.commentDraft."+target.type+"."+target.id}
    var body:some View {
        SourceCommunitySheet(title:app.t(writing ? "写评论":"这句的回声"),back:writing && !comments.isEmpty ? {writing=false}:nil,close:{dismiss()}) {
            ScrollView {
                VStack(alignment:.leading,spacing:12) {
                    VStack(alignment:.leading,spacing:writing ? 6:12) {
                        Text(app.t(target.title)).sourceFont(writing ? 16:23,weight:750).lineSpacing(writing ? 3:5).fixedSize(horizontal:false,vertical:true)
                        if !target.speaker.isEmpty {Text("— " + (target.speaker=="匿名坑底人" ? app.t(target.speaker):target.speaker)).sourceFont(11).foregroundStyle(Color(white:0.4))}
                    }.padding(writing ? 10:14).frame(maxWidth:.infinity,alignment:.leading).background(Color(red:238/255,green:238/255,blue:233/255))
                    if loading {ProgressView().frame(maxWidth:.infinity)}
                    if let error {Text(app.t(error)).sourceFont(12).foregroundStyle(Pit.pink);Button(app.t("重试")) {Task{await load()}}}
                    if writing {CommunityFields(nickname:$nickname,text:$bodyText,limit:400,placeholder:"说点什么，接梗也行。",focusOnAppear:true)}
                    else {
                        ForEach(comments.filter{!community.isBlocked($0.author_key)}) {comment in
                            VStack(alignment:.leading,spacing:8) {
                                HStack {Text(comment.nickname=="匿名坑底人" ? app.t(comment.nickname):comment.nickname).sourceFont(11,weight:750);Spacer();Text(comment.created_at.prefix(10)).sourceFont(10).foregroundStyle(.secondary);Button {safetyTarget=SafetyTarget(type:"comment",id:comment.id,text:comment.body,canBlock:comment.author_key != nil)} label:{Text("⋯").sourceFont(18).frame(width:44,height:44)}.buttonStyle(SourceButtonStyle()).accessibilityLabel(app.t("举报与屏蔽"))}
                                Text(app.t(comment.body)).sourceFont(14).lineSpacing(4).textSelection(.enabled)
                            }.padding(12).frame(maxWidth:.infinity,alignment:.leading).background(.white)

                        }
                        if hasMore {Button(app.t("加载更多")) {Task{await load(more:true)}}.frame(minHeight:44)}
                    }
                }.padding(.horizontal,18).padding(.top,8).padding(.bottom,18)
                    .background(GeometryReader {g in Color.clear.preference(key:CommunityContentHeight.self,value:g.size.height)})
            }.scrollDismissesKeyboard(.interactively)
        } footer:{
            Button {if writing {Task{await send()}} else {writing=true}} label: {
                HStack(spacing:8) {SourceIcon(writing ? "PaperPlaneTilt":"PencilSimpleLine",weight:"bold",size:18).foregroundStyle(Pit.pink);Text(app.t(sending ? "正在送出":writing ? "留下回声":"写评论")).sourceFont(14,weight:750)}.frame(maxWidth:.infinity,minHeight:44).background(Pit.ink).foregroundStyle(.white)
            }.buttonStyle(SourceButtonStyle()).disabled(!community.configured || sending || loading || (writing && !CommunityValidation.valid(bodyText,range:2...400)))
                .padding(.horizontal,18).padding(.vertical,10)
        }
        .task {
            bodyText=UserDefaults.standard.string(forKey:draftKey) ?? ""
            if community.statsAreFresh && community.stats[target.type+":"+target.id]?.comment_count==0 {writing=true;loading=false} else {await load()}
        }
        .onChange(of:bodyText) {_,value in UserDefaults.standard.set(value,forKey:draftKey)}
        .fullScreenCover(item:$safetyTarget) {CommunitySafetySheet(target:$0)}
        .task {await community.recordView(type:target.type,id:target.id)}
        .onPreferenceChange(CommunityContentHeight.self) {contentHeight=$0}
        .sourceSheet(height:min(viewport.height*0.84,contentHeight+130+bottom))
    }
    func load(more:Bool=false) async {
        loading=true;defer{loading=false}
        do {let rows=try await community.comments(type:target.type,id:target.id,offset:more ? comments.count:0);if more {comments += rows}else{comments=rows};hasMore=rows.count==30;writing=comments.isEmpty;error=nil}
        catch {self.error=error.localizedDescription}
    }
    func send() async {
        sending=true;defer{sending=false}
        do {try await community.submit(type:target.type,id:target.id,nickname:nickname,body:bodyText);bodyText="";await load()}
        catch {self.error=error.localizedDescription}
    }
}

struct SourceCommunitySheet<Content:View,Footer:View>:View {
    let title:String;var back:(()->Void)?=nil;let close:()->Void
    @ViewBuilder let content:()->Content
    @ViewBuilder let footer:()->Footer
    var body:some View {
        VStack(spacing:0) {
            Rectangle().fill(Pit.pink).frame(height:4)
            HStack(spacing:0) {
                if let back {Button(action:back){SourceIcon("ArrowLeft",size:18).frame(width:44,height:44)}}
                Text(title).sourceFont(16,weight:750).padding(.leading,back == nil ? 16:0);Spacer()
                Button(action:close){SourceIcon("X",size:18).frame(width:44,height:44)}.accessibilityLabel("关闭")
            }.frame(minHeight:62)
            content()
            footer()
        }.background(Pit.paper)
    }
}
struct CommunityFields:View {
    @EnvironmentObject var app:AppModel
    @EnvironmentObject var community:CommunityStore
    @Binding var nickname:String;@Binding var text:String
    let limit:Int;let placeholder:String
    var focusOnAppear=false
    @FocusState private var editing:Bool
    var body:some View {
        VStack(alignment:.leading,spacing:10) {
            Text(app.t("怎么称呼你")).sourceFont(12)
            TextField(app.t("匿名坑底人"),text:$nickname).sourceFont(16).frame(minHeight:44).overlay(alignment:.bottom){Rectangle().fill(Color(white:0.8)).frame(height:1)}
                .onChange(of:nickname){_,value in if value.count>24 {nickname=String(value.prefix(24))}}
            Text(app.t("留下回声")).sourceFont(12)
            ZStack(alignment:.topLeading) {
                if text.isEmpty {Text(app.t(placeholder)).sourceFont(16).foregroundStyle(.secondary).padding(.top,8).padding(.leading,5).allowsHitTesting(false)}
                TextEditor(text:$text).focused($editing).sourceFont(16).scrollContentBackground(.hidden).frame(height:72).accessibilityLabel(app.t("评论内容"))
            }.overlay(alignment:.bottom){Rectangle().fill(Color(white:0.8)).frame(height:1)}
                .onChange(of:text){_,value in if value.count>limit {text=String(value.prefix(limit))}}
        }.disabled(!community.configured).onAppear {if focusOnAppear {editing=true}}
    }
}
private struct CommunityContentHeight:PreferenceKey {
    static let defaultValue:CGFloat=300
    static func reduce(value:inout CGFloat,nextValue:()->CGFloat) {value=nextValue()}
}

struct PublishQuoteSheet:View {
    var onPublished:()->Void = {}
    @EnvironmentObject var app:AppModel
    @EnvironmentObject var community:CommunityStore
    @Environment(\.dismiss) var dismiss
    @AppStorage("glfans.quoteDraft") private var text=""
    @AppStorage("glfans.nickname") private var speaker=""
    @State private var sending=false
    @State private var error:String?
    var body:some View {
        SourceCommunitySheet(title:app.t("留一句坑底原话"),close:{dismiss()}) {
            ScrollView {
                CommunityFields(nickname:$speaker,text:$text,limit:120,placeholder:"写下一句坑底原话。").padding(.horizontal,18).padding(.top,8).padding(.bottom,18)
            }
        } footer:{
            HStack {
                if let error {Text(app.t(error)).sourceFont(12).foregroundStyle(Pit.pink)}
                Spacer(minLength:0)
                Button {
                    sending=true;Task {do{try await community.publish(text:text,speaker:speaker);text="";onPublished();dismiss()}catch{self.error=error.localizedDescription};sending=false}
                } label:{
                    HStack(spacing:8){SourceIcon("PaperPlaneTilt",weight:"bold",size:18);Text(app.t(sending ? "正在送出":"发布原话")).sourceFont(14,weight:750)}.padding(.horizontal,14).frame(minHeight:44).background(Pit.ink).foregroundStyle(.white)
                }.buttonStyle(SourceButtonStyle()).disabled(!community.configured || sending || !CommunityValidation.valid(text,range:2...120))
            }.padding(.horizontal,18).padding(.vertical,10)
        }.sourceSheet(height:350)
    }
}
