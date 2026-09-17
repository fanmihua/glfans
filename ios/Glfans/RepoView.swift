import SwiftUI
import GlfansCore

struct RepoView:View {
    @EnvironmentObject var app:AppModel
    @Environment(\.sourceViewport) var viewport
    @Environment(\.sourceBottomInset) var bottom
    let catalog:Catalog
    var body:some View {
        ScrollView {
            VStack(spacing:0) {
                hero
                RepoFilm()
                LazyVGrid(columns:[GridItem(.flexible(),spacing:16),GridItem(.flexible())],spacing:28) {
                    ForEach(Array(catalog.collections.enumerated()),id:\.element.id) {i,collection in
                        NavigationLink {CollectionView(collection:collection)} label:{collectionCard(collection,index:i)}
                            .buttonStyle(SourceButtonStyle()).accessibilityIdentifier("collection-"+collection.slug)
                    }
                }.padding(.horizontal,22).padding(.top,28).padding(.bottom,34)
                note.padding(.horizontal,22).padding(.bottom,30+90+bottom)
            }
        }.background(Pit.paper)
    }
    var hero:some View {
        let s=min(82,max(64,viewport.width * 0.2)),h=s*1.591+64
        return ZStack(alignment:.topLeading) {
            LocalArtwork(source:"assets/repo-hero-ghost-word.webp").frame(width:viewport.width*0.78).brightness(-1).opacity(0.025).rotationEffect(.degrees(-1.4)).offset(x:viewport.width*0.07,y:44)
            ZStack(alignment:.topLeading) {
                if app.locale=="zh" {
                    VStack(alignment:.leading,spacing:0) {
                        HStack(alignment:.bottom,spacing:s*0.04) {
                            SourceLine(text:"Repo",size:s*0.9,family:"AlibabaPuHuiTi-Heavy",weight:900,kern:-s*0.9*0.08,lineHeight:s*0.9*0.78)
                            SourceLine(text:"文",size:s*0.96,family:"AlibabaPuHuiTi-Heavy",weight:900,kern:-s*0.096,lineHeight:s*0.96*0.78)
                        }
                        HStack(alignment:.bottom,spacing:0) {
                            ForEach(Array("证据目录".enumerated()),id:\.offset) {i,c in
                                let q:CGFloat=[0.9,1.06,0.96,1.08][i]
                                SourceLine(text:String(c),size:s*q,family:"AlibabaPuHuiTi-Heavy",weight:900,kern:-s*q*0.095,lineHeight:s*q*0.78,color:UIColor(Pit.pink))
                                    .rotationEffect(.degrees([-1.2,0.8,-0.6,1.1][i])).offset(y:s*q*[-0.02,0.035,-0.045,0.025][i])
                            }
                        }.scaleEffect(x:1.02,y:1,anchor:.leading)
                    }.rotationEffect(.degrees(-1.2))
                } else {
                    VStack(alignment:.leading,spacing:12) {
                        Text("Repo").sourceFont(min(92,max(64,viewport.width*0.19))*0.9,family:"AlibabaPuHuiTi-Heavy",weight:900)
                        Text(app.t("证据目录")).sourceFont(min(92,max(64,viewport.width*0.19))*0.48,family:app.locale=="th" ? "NotoSansThai-Regular":"AlibabaPuHuiTi-Heavy",weight:900).foregroundStyle(Pit.pink).fixedSize(horizontal:false,vertical:true)
                    }.rotationEffect(.degrees(-1.2))
                }
                SourceTexture("assets/repo-handdrawn-underline-pink.webp").frame(width:viewport.width-44,height:60).rotationEffect(.degrees(-1.1)).offset(y:h-70)
                Text(app.t("LOVE ARCHIVE / 06 COLLECTIONS").replacingOccurrences(of: "06", with: String(format: "%02d", catalog.collections.count))).sourceFont(6,weight:700).tracking(0.84).padding(.horizontal,10).padding(.vertical,7).background(Pit.ink).foregroundStyle(.white).rotationEffect(.degrees(-4)).frame(maxWidth:.infinity,alignment:.trailing).offset(y:h-53.5)
                Text(app.t("每一份心动，都有迹可循。")).sourceFont(13,family:"RobotoCondensed-Regular",weight:500).tracking(0.65).offset(y:h-12.5)
            }.frame(width:viewport.width-44,height:h,alignment:.topLeading).padding(.horizontal,22).padding(.top,88)
        }.frame(height:h+112,alignment:.topLeading)
    }
    func collectionCard(_ collection:RepoCollection,index:Int)->some View {
        let w=(viewport.width-60)/2
        return VStack(spacing:0) {
            SourcePhoto(source:collection.cover,focus:collection.slug=="rival-lover" ? "50% 10%":"50% 50%")
                .saturation(0).contrast(1.06).frame(width:w,height:w*0.75)
                .overlay(alignment:.topLeading) {Text(String(format:"%02d",index+1)).sourceFont(10,family:"RobotoCondensed-Regular",weight:700).frame(width:28,height:28).background(Pit.pink.opacity(0.28)).clipShape(Circle()).overlay(Circle().stroke(Pit.ink,lineWidth:1)).foregroundStyle(Pit.ink).padding(10)}
            VStack(alignment:.leading,spacing:0) {
                Text(app.t(collection.issue)).sourceFont(8,weight:700).tracking(0.96).foregroundStyle(Pit.ink)
                Spacer(minLength:4)
                Text(app.t(collection.title)).sourceFont(min(21,max(18,viewport.width*0.05)),family:"RobotoCondensed-Regular",weight:700).fixedSize(horizontal:false,vertical:true).padding(.bottom,12)
                Text(String(collection.visibleArticles.count)+app.t(" 篇 Repo / 侧写")).sourceFont(9).tracking(0.18).padding(.trailing,22)
            }.frame(maxWidth:.infinity,alignment:.leading).padding(.horizontal,10).padding(.vertical,12).frame(height:102)
                .overlay(alignment:.bottomTrailing) {SourceIcon("ArrowRight",size:14).padding(4).background(Pit.pink.opacity(0.28)).clipShape(Circle()).overlay(Circle().stroke(Pit.ink,lineWidth:1)).padding(10)}
        }.background(Pit.paper).overlay(Rectangle().stroke(Pit.ink,lineWidth:1))
            .overlay(alignment:.topLeading) {if index==0 {SourceIcon("Paperclip",size:38).frame(width:24,height:50).rotationEffect(.degrees(-14)).offset(x:12,y:-20).foregroundStyle(Color(white:0.35))}}
            .overlay(alignment:.topTrailing) {if index==5 {Rectangle().fill(Pit.pink.opacity(0.65)).frame(width:65,height:24).rotationEffect(.degrees(17)).offset(x:4,y:-12)}}
            .rotationEffect(.degrees([-2,1.5,-1.8,1,-2,2][index])).offset(y:[0,8,2,6,0,10][index])
    }
    var note:some View {
        VStack(alignment:.leading,spacing:18) {
            VStack(alignment:.leading,spacing:10) {
                Text(app.t("ARCHIVE NOTE")).sourceFont(10,weight:750).tracking(1.5).foregroundStyle(Pit.pink)
                if app.locale=="zh" {(Text("目前包含已有泰百repo\n及二创类文章共")+Text("21").foregroundColor(Pit.pink)+Text("篇：")).sourceFont(22,family:"RobotoCondensed-Regular",weight:700).lineSpacing(4)}
                else {Text(app.t("目前包含已有泰百repo及二创类文章共21篇：")).sourceFont(22,family:"RobotoCondensed-Regular",weight:700)}
            }
            Text(app.t("待更新：")).sourceFont(10)
            HStack(alignment:.top,spacing:18) {
                ForEach([("宿敌恋人","ep9-ep10"),("月下之影","片段")],id:\.0) {item in
                    VStack(alignment:.leading,spacing:6) {
                        HStack(spacing:8) {Text(app.t(item.0)).sourceFont(15,weight:700);Rectangle().fill(Pit.pink).frame(width:5,height:5).rotationEffect(.degrees(12))}
                        Text(app.t(item.1)).sourceFont(11)
                    }.frame(maxWidth:.infinity,alignment:.leading)
                }
            }
        }.frame(maxWidth:.infinity,alignment:.leading).padding(.top,18).padding(.bottom,24).overlay(alignment:.top){Rectangle().stroke(Pit.ink.opacity(0.2),style:StrokeStyle(lineWidth:1,dash:[4,4])).frame(height:1)}
    }
}
struct RepoFilm:View {
    var body:some View {
        HStack(spacing:7) {
            SourceIcon("Plus",size:18).frame(width:20)
            GeometryReader {g in
                HStack(spacing:6) {ForEach(WebsiteContent.shared?.footerFilm ?? []) {film in
                    SourcePhoto(source:film.image,focus:film.focus).frame(width:120,height:58).saturation(0).contrast(1.18).opacity(0.78).overlay(Rectangle().stroke(.white.opacity(0.34),lineWidth:1))
                }}.frame(width:g.size.width,alignment:.leading).clipped()
            }.frame(height:58)
            SourceIcon("Plus",size:18).frame(width:20)
        }.padding(.horizontal,12).frame(height:74).background(Pit.ink).foregroundStyle(Pit.pink)
    }
}

struct CollectionView:View {
    @EnvironmentObject var app:AppModel
    @Environment(\.dismiss) var dismiss
    @Environment(\.sourceViewport) var viewport
    @Environment(\.sourceBottomInset) var bottom
    let collection:RepoCollection
    var index:Int {app.catalog?.collections.firstIndex(where:{$0.id==collection.id}) ?? 0}
    var roman:String {["ENEMIES WITH BENEFITS","US","LOVE DESIGN","POISONOUS LOVE","HARMONY SECRET","AFFAIR"][index]}
    var body:some View {
        ScrollView {
            VStack(spacing:0) {
                VStack(alignment:.leading,spacing:16) {
                    Button {dismiss()} label:{
                        VStack(spacing:0) {
                            Text(app.t("← 返回合集")).sourceFont(8,weight:750).padding(.horizontal,8).padding(.top,6).padding(.bottom,5).frame(minWidth:66).background(Pit.pink)
                            Text(String(format:"%02d",index+1)).sourceFont(21,family:"RobotoCondensed-Black",weight:900).padding(.horizontal,8).padding(.top,5).padding(.bottom,6).frame(minWidth:66).background(Pit.ink).foregroundStyle(.white)
                        }.rotationEffect(.degrees(-5)).frame(minHeight:44)
                    }.buttonStyle(SourceButtonStyle()).accessibilityIdentifier("collection-back").accessibilityLabel(app.t("返回全部合集"))
                    collectionTitle
                    collectionPhoto.frame(maxWidth:.infinity).overlay(alignment:.topTrailing) {
                        VStack(alignment:.trailing,spacing:4) {Text(app.t("Love is not a feeling."));(Text(app.t("It's "))+Text(app.t("Evidence.")).foregroundColor(Pit.pink))}
                            .sourceFont(8,weight:700).padding(.horizontal,8).padding(.vertical,5).background(Pit.ink).foregroundStyle(.white).rotationEffect(.degrees(3)).padding(.top,12)
                    }
                    facts.padding(.horizontal,2)
                    Text(app.t("ROMANCE / EVIDENCE / ARCHIVE")).sourceFont(7,weight:750).tracking(0.8).padding(.horizontal,10).padding(.top,7).padding(.bottom,6).background(Pit.ink).foregroundStyle(.white).frame(maxWidth:.infinity).padding(.top,-12).offset(y:28)
                }.padding(.horizontal,22).padding(.top,70).padding(.bottom,16)
                    .background(alignment:.topTrailing) {LocalArtwork(source:"assets/repo-hero-ghost-word.webp").frame(width:viewport.width*0.54).opacity(0.025).offset(y:66)}
                    .overlay(alignment:.bottom){Rectangle().stroke(Pit.ink.opacity(0.2),style:StrokeStyle(lineWidth:1,dash:[5,5])).frame(height:1)}
                VStack(spacing:0) {
                    HStack(spacing:6) {Text(app.t("这一坑的 "));Text(app.t("Repo")).foregroundStyle(Pit.pink).background(alignment:.bottom){SourceTexture("assets/repo-handdrawn-underline-pink.webp").frame(height:28).offset(y:20)}}
                        .sourceFont(42,family:"RobotoCondensed-Regular",weight:700).frame(maxWidth:.infinity,alignment:.leading).padding(.horizontal,22).padding(.top,48)
                    ScrollView(.horizontal) {
                        HStack(spacing:18) {
                            ForEach(Array(collection.visibleArticles.enumerated()),id:\.element.id) {i,article in
                                NavigationLink {ArticleView(collection:collection,article:article)} label:{articleCard(article,index:i)}.buttonStyle(SourceButtonStyle()).accessibilityIdentifier("article-"+article.slug)
                            }
                        }.padding(.horizontal,18).padding(.top,10).padding(.bottom,20).frame(minWidth:viewport.width)
                    }.scrollIndicators(.hidden)
                        .background(alignment:.bottom){SourceTexture("assets/repo-collection-black-torn-v2.webp").frame(height:215).padding(.bottom,24)}
                }.padding(.bottom,90+bottom)
            }
        }.background(Pit.paper).toolbar(.hidden,for:.navigationBar)
    }
    var collectionTitle:some View {
        VStack(alignment:.leading,spacing:14) {
            if app.locale=="zh" {
                let s=min(58,max(42,viewport.width*0.132))
                HStack(spacing:0) {ForEach(Array(collection.title.enumerated()),id:\.offset) {i,c in
                    SourceLine(text:String(c),size:s,family:"AlibabaPuHuiTi-Heavy",weight:900,kern:-s*0.1,lineHeight:s*0.82,color:UIColor(i==collection.title.count-1 ? Pit.pink:Pit.ink))
                        .rotationEffect(.degrees([-2.8,1.5,-1.8,1.8,3.2][i%5])).offset(y:[8,-3,5,-6,3][i%5])
                }}
            } else {Text(app.t(collection.title)).sourceFont(min(46,max(32,viewport.width*0.09)),family:app.locale=="th" ? "NotoSansThai-Regular":"AlibabaPuHuiTi-Heavy",weight:900).fixedSize(horizontal:false,vertical:true)}
            Text(app.t(roman)).sourceFont(10,family:"DingTalk-JinBuTi",weight:400).tracking(1.2).rotationEffect(.degrees(-3)).padding(.leading,(viewport.width-44)*0.1)
        }.padding(.top,8).padding(.bottom,16).frame(maxWidth:.infinity,minHeight:108,alignment:.leading)
            .background(alignment:.bottomLeading){SourceTexture("assets/repo-handdrawn-underline-pink.webp").frame(width:(viewport.width-44)*0.72,height:26).padding(.leading,(viewport.width-44)*0.08)}
            .rotationEffect(.degrees(-2),anchor:.leading)
    }
    var collectionPhoto:some View {
        let w=min(260,max(200,viewport.width*0.62)),h=w*1402/1122
        return ZStack(alignment:.topLeading) {
            SourceTexture("assets/repo-collection-poster-frame-v1.webp").frame(width:w*1.08,height:h*1.07).offset(x:-w*0.045,y:-h*0.025)
            SourcePhoto(source:collection.cover,focus:"50% 50%").frame(width:w*0.787,height:h*0.83).saturation(0.88).contrast(1.02).brightness(0.02).scaleEffect(1.04).rotationEffect(.degrees(-4.25)).offset(x:w*0.108,y:h*0.088)
            SourceTexture("assets/repo-collection-pink-brush-v1.webp").frame(width:w*0.88,height:h*0.2).rotationEffect(.degrees(-1.5)).offset(x:w*0.16,y:h*0.83)
            SourceIcon("Paperclip",size:28).foregroundStyle(Color(white:0.4)).rotationEffect(.degrees(8)).offset(x:w*0.97-28,y:-6)
            LocalArtwork(source:"assets/repo-handdrawn-heart-pink.webp").frame(width:24,height:24).rotationEffect(.degrees(12)).offset(x:w-22,y:h*0.14)
            LocalArtwork(source:"assets/repo-handdrawn-heart-pink.webp").frame(width:18,height:18).rotationEffect(.degrees(-14)).offset(x:w-15,y:h*0.36)
        }.frame(width:w,height:h).rotationEffect(.degrees(-2.2))
    }
    var facts:some View {
        let root=ArticleDocumentParser.parse(collection.summaryXml)
        let children=root?.descendants("column").last?.children ?? []
        let paragraphs=children.filter{$0.tag=="p"}
        let needles=[["首播"],["放送时间","播放时间"],["播出平台","制作公司"],["主要演员"]]
        let rows=needles.compactMap {keys in paragraphs.first{p in keys.contains{p.text.contains($0)}}}
        return VStack(spacing:0) {
            ForEach(Array(rows.enumerated()),id:\.element.id) {i,node in
                let raw=node.text.replacingOccurrences(of:"\\s+",with:" ",options:.regularExpression).trimmingCharacters(in:.whitespacesAndNewlines)
                let separator=raw.firstIndex(where:{ $0 == "：" || $0 == ":" })
                let label=separator.map{String(raw[..<$0])} ?? raw
                let sourceValue=separator.map{String(raw[raw.index(after:$0)...])} ?? ""
                let next=(children.firstIndex(where:{$0.id==node.id}) ?? children.count)+1
                let actors=label.contains("主要演员") && children.indices.contains(next) && children[next].tag=="ul" ? children[next].descendants("li").map(\.text).joined(separator:" / "):""
                let value=(sourceValue+" "+actors).trimmingCharacters(in:.whitespacesAndNewlines)
                let emphasis=node.descendants("a").first?.text ?? ""
                HStack(alignment:.top,spacing:7) {
                    SourceIcon(["CalendarDots","NotePencil","TelevisionSimple","UsersThree"][i%4],weight:"bold",size:16).frame(width:20)
                    let layout=app.locale=="zh" ? AnyLayout(HStackLayout(alignment:.top,spacing:6)):AnyLayout(VStackLayout(alignment:.leading,spacing:3))
                    layout {
                        Text(app.t(label)+"：").sourceFont(11,weight:700).fixedSize()
                        factValue(value,emphasis:emphasis,cast:label.contains("主要演员")).sourceFont(12,weight:500).lineSpacing(3).fixedSize(horizontal:false,vertical:true).frame(maxWidth:.infinity,alignment:.leading)
                    }
                }.padding(.vertical,8).overlay(alignment:.bottom){if i<rows.count-1 {Rectangle().fill(Pit.ink.opacity(0.16)).frame(height:1)}}
            }
        }
    }
    func factValue(_ value:String,emphasis:String,cast:Bool)->Text {
        if app.locale != "zh" {return Text(cast ? value.components(separatedBy:" / ").map{app.t($0)}.joined(separator:" / "):app.t(value))}
        guard !emphasis.isEmpty,let range=value.range(of:emphasis) else{return Text(value)}
        return Text(String(value[..<range.lowerBound]))+Text(emphasis).bold().foregroundColor(Pit.pink)+Text(String(value[range.upperBound...]))
    }
    func articleCard(_ article:RepoArticle,index:Int)->some View {
        let a=index%2==0,w=viewport.width-42,h:CGFloat=390,parts=article.label.components(separatedBy:"·").map{$0.trimmingCharacters(in:.whitespaces)}
        return ZStack(alignment:.topLeading) {
            SourceTexture(a ? "assets/repo-article-card-frame-a-v1.webp":"assets/repo-article-card-frame-b-v1.webp")
            SourcePhoto(source:article.cover ?? collection.cover).frame(width:w*(a ? 0.622:0.502),height:h*(a ? 0.398:0.342)).saturation(0).rotationEffect(.degrees(a ? -0.65:0)).offset(x:w*(a ? 0.193:0.242),y:h*(a ? 0.122:0.152))
            VStack(alignment:.leading,spacing:12) {
                Text(app.t("ARTICLE / ")+String(format:"%02d",index+1)).sourceFont(9,weight:700).tracking(1)
                VStack(alignment:.leading,spacing:8) {
                    Text(app.t(parts.first ?? article.label)).sourceFont(app.locale=="zh" ? (viewport.width<=360 ? 20:25):16,family:"RobotoCondensed-Regular",weight:700).fixedSize(horizontal:false,vertical:true)
                    if parts.count>1 {Text(parts.dropFirst().map{app.t($0)}.joined(separator:" · ")).sourceFont(15.5,family:"RobotoCondensed-Regular",weight:500).fixedSize(horizontal:false,vertical:true)}
                }
            }.frame(width:w*(a ? 0.7:0.605),alignment:.leading).offset(x:w*(a ? 0.15:0.235),y:h*(a ? 0.62:0.60))
            SourceIcon("ArrowRight",size:18).padding(8).background(Pit.pink).rotationEffect(.degrees(-28)).offset(x:w*(a ? 0.85:0.84)-34,y:h*(a ? 0.92:0.91)-52)
        }.frame(width:w,height:h).scaleEffect(a ? 0.94:1).rotationEffect(.degrees(a ? -1.35:1.8))
            .scaleEffect(0.9).frame(width:w*0.9,height:h*0.9)
    }
}
