import SwiftUI
import GlfansCore

struct RadioView: View {
    @EnvironmentObject var app: AppModel
    @EnvironmentObject var radio: RadioPlayer
    @Environment(\.sourceViewport) var viewport
    @Environment(\.sourceBottomInset) var bottom
    @Environment(\.accessibilityReduceMotion) var reduceMotion
    let catalog: Catalog
    @State private var playlist = false
    @State private var help = false
    @State private var angle = 0.0
    @State private var lastTick = Date()
    @State private var needleDrag: CGFloat = 0
    var station: Station? { catalog.radio.stations.first { $0.id == radio.stationID } }
    var w: CGFloat { viewport.width }
    var machineW: CGFloat { w - 12 }
    var machineH: CGFloat { machineW * 1024 / 1535 }
    var titleH: CGFloat { app.locale == "zh" ? min(86,max(54,w * 0.16)) * 0.9 + 12 + min(98,max(62,w * 0.18)) * 0.78 : min(46,max(30,w * 0.086))*1.3 + 12 + min(98,max(62,w * 0.18))*0.78 }
    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                title.frame(height: titleH).padding(.horizontal,22).offset(y:16)
                ZStack(alignment:.topLeading) {
                    VStack(spacing: 4) {
                        turntable.frame(width:machineW,height:machineH)
                        controls
                    }.padding(.top,machineW * 0.1674)
                    if radio.track == nil {
                        VStack(alignment:.leading,spacing:4) {
                            (Text("01 ").bold() + Text(app.t("点贴纸，选她们的歌"))).sourceFont(10,weight:750)
                            Text(app.t("也可以拖入唱片")).sourceFont(11).foregroundStyle(Pit.pink)
                        }.padding(.horizontal,8).padding(.vertical,6).background(Pit.ink).foregroundStyle(.white)
                            .rotationEffect(.degrees(-8)).offset(x:machineW * 0.29,y:12)
                        RadioGuideArrow().stroke(Pit.pink,style:StrokeStyle(lineWidth:2.3,lineCap:.round,lineJoin:.round))
                            .frame(width:50,height:22).scaleEffect(x:-1,y:1).rotationEffect(.degrees(65)).offset(x:machineW * 0.28,y:54)
                    }
                }.padding(.top,20).padding(.horizontal,6)
                VStack(spacing:6) {
                    Link(destination:URL(string:"https://music.163.com/#/playlist?id=" + catalog.radio.playlistId)!) {
                        HStack(spacing:6) { Text(app.t("网易云完整歌单 ")).sourceFont(10,weight:720); SourceIcon("ArrowSquareOut",size:13).foregroundStyle(Pit.pink) }
                            .padding(.horizontal,10).frame(height:32).background(Pit.ink.opacity(0.06)).frame(minHeight:44)
                    }
                    Text(app.t("网易云歌单音源 · 权利归原权利人")).sourceFont(10,weight:400).foregroundStyle(Pit.ink.opacity(0.55))
                    if let error = radio.error { Text(app.t(error)).sourceFont(11).foregroundStyle(Pit.pink).accessibilityIdentifier("radio-error") }
                }.padding(.top,12)
            }.padding(.top,70).padding(.bottom,110 + bottom)
        }.background(Pit.paper)
        .onReceive(Timer.publish(every:1/30,on:.main,in:.common).autoconnect()) { now in
            if radio.playing && !reduceMotion { angle = (angle + min(now.timeIntervalSince(lastTick),0.1) * 45).truncatingRemainder(dividingBy:360) }
            lastTick = now
        }
        .fullScreenCover(isPresented:$playlist) { playlistSheet.sourceSheet(height:min(viewport.height * 0.68,CGFloat(station?.tracks.count ?? 0) * 61 + 100)) }
        .fullScreenCover(isPresented:$help) {
            ZStack {
                Color.black.opacity(0.5).ignoresSafeArea().onTapGesture {help=false}
                RadioHelp(close:{help=false}).frame(width:min(320,w-80))
                    .accessibilityElement(children:.contain).accessibilityAddTraits(.isModal)
            }
            .presentationBackground(.clear)
        }
    }
    var title: some View {
        ZStack(alignment:.topLeading) {
            if app.locale == "zh" {
                let cn = min(86,max(54,w * 0.16)), en = min(98,max(62,w * 0.18))
                SourceLine(text:"坑底电台",size:cn,family:"AlibabaPuHuiTi-Heavy",weight:900,kern:-cn * 0.11,lineHeight:cn * 0.9,stroke:0.45)
                    .rotationEffect(.degrees(-2.6),anchor:.bottomLeading)
                HStack(spacing:14) {
                    SourceLine(text:"PIT",size:en,family:"RobotoCondensed-Black",weight:900,kern:-en * 0.08,lineHeight:en * 0.78,color:UIColor(Pit.pink)).scaleEffect(x:1,y:1.04,anchor:.bottomLeading).rotationEffect(.degrees(1))
                    SourceLine(text:"FM",size:en,family:"RobotoCondensed-Black",weight:900,kern:-en * 0.08,lineHeight:en * 0.78).scaleEffect(x:1,y:0.96,anchor:.bottomLeading).rotationEffect(.degrees(-1.4))
                }.rotationEffect(.degrees(-2.2),anchor:.topLeading).offset(x:w * 0.2,y:cn * 0.9 + 12)
            } else {
                let cn=min(46,max(30,w * 0.086)),en=min(98,max(62,w * 0.18))
                SourceLine(text:app.t("坑底电台"),size:cn,family:app.locale=="th" ? "NotoSansThai-Regular":"AlibabaPuHuiTi-Heavy",weight:900,lineHeight:cn*1.3).rotationEffect(.degrees(-2))
                HStack(spacing:14) {
                    SourceLine(text:"PIT",size:en,family:"RobotoCondensed-Black",weight:900,kern:-en*0.08,lineHeight:en*0.78,color:UIColor(Pit.pink))
                    SourceLine(text:"FM",size:en,family:"RobotoCondensed-Black",weight:900,kern:-en*0.08,lineHeight:en*0.78)
                }.rotationEffect(.degrees(-2.2),anchor:.topLeading).offset(x:w*0.2,y:cn*1.3+12)
            }
            Button { help = true } label: {
                HStack(spacing:4) { SourceIcon("Question",size:16); Text(app.t("怎么玩")).sourceFont(11,weight:650) }
                    .padding(.horizontal,7).frame(height:28).overlay(Capsule().stroke(Color(white:0.82),lineWidth:1)).frame(minHeight:44)
            }.buttonStyle(SourceButtonStyle()).rotationEffect(.degrees(-7)).offset(x:-4,y:app.locale == "zh" ? min(86,max(54,w * 0.16)) * 0.9 + 10:min(46,max(30,w * 0.086))*1.3 + 10)
                .accessibilityIdentifier("radio-help").accessibilityLabel(app.t("查看坑底电台玩法说明"))
        }.frame(maxWidth:.infinity,maxHeight:.infinity,alignment:.topLeading)
    }
    var turntable: some View {
        ZStack(alignment:.topLeading) {
            LocalArtwork(source:"assets/pit-radio/pit-fm-broadcast-card-v1.webp")
                .frame(width:machineW * 0.5).scaleEffect(0.82,anchor:.bottom)
                .rotationEffect(.degrees(22),anchor:.bottom).offset(x:machineW * 0.32,y:-machineH * 0.23)
            machine
                .scaleEffect(x:1,y:0.82).rotationEffect(.degrees(-0.8))
            ForEach(Array(catalog.radio.stations.enumerated()),id:\.element.id) { i,value in
                stationSticker(value,index:i)
            }
        }.frame(width:machineW,height:machineH)
    }
    var machine: some View {
        ZStack(alignment:.topLeading) {
            SourceTexture("assets/pit-radio/turntable-chassis-record-backing-v3.webp").frame(width:machineW,height:machineH)
            ZStack {
                Canvas { context,size in
                    for radius in stride(from:CGFloat(2),through:size.width/2,by:3.4) {
                        context.stroke(Path(ellipseIn:CGRect(x:size.width/2-radius,y:size.height/2-radius,width:radius*2,height:radius*2)),with:.color(.white.opacity(0.03)),lineWidth:0.8)
                    }
                }
                if let station { LocalArtwork(source:station.artwork).frame(width:machineW * 0.41237785 * 0.37,height:machineW * 0.41237785 * 0.52).rotationEffect(.degrees(-3)) }
            }.rotationEffect(.degrees(angle))
                .frame(width:machineW * 0.41237785,height:machineW * 0.41237785).clipShape(Circle())
                .scaleEffect(x:1,y:0.78831).offset(x:machineW * 0.30358306,y:machineH * 0.05957031)
                .dropDestination(for:String.self) { items,_ in
                    guard let id=items.first,let value=catalog.radio.stations.first(where:{$0.id==id}) else{return false};radio.select(value);return true
                }
            playerLabel
            SourceTexture("assets/pit-radio/turntable-tonearm-v2.webp").frame(width:machineW,height:machineH)
                .rotationEffect(.degrees(radio.needleDown ? 0 : -20 + Double(needleDrag)*20),anchor:UnitPoint(x:0.80782,y:0.22266))
                .animation(reduceMotion ? nil:.timingCurve(0.22,0.72,0.2,1,duration:0.62),value:radio.needleDown)
                .allowsHitTesting(false)
            Button { radio.play() } label: { Color.clear.contentShape(RadioNeedleHit()) }
                .buttonStyle(.plain)
                .frame(width:machineW * 0.27,height:machineH * 0.56).offset(x:machineW * 0.62,y:machineH * 0.13)
                .disabled(radio.track == nil || radio.needleDown).accessibilityIdentifier("radio-needle").accessibilityLabel(app.t("拖动或点按唱针开始播放"))
                .simultaneousGesture(DragGesture(minimumDistance:8).onChanged { value in needleDrag=min(1,max(0,-value.translation.width/60)) }.onEnded { _ in if needleDrag > 0.35 {radio.play()};needleDrag=0 })
            if radio.track != nil && !radio.needleDown {
                (Text("02 ").bold()+Text(app.t("点一下，开始播放"))).sourceFont(10,weight:700)
                    .padding(6).background(Pit.pink).rotationEffect(.degrees(8)).offset(x:machineW * 0.60,y:machineH * 0.75).allowsHitTesting(false)
            }
        }.frame(width:machineW,height:machineH)
    }
    var playerLabel: some View {
        VStack(alignment:.leading,spacing:5) {
            Text(station.map { $0.name + " · " + String(($0.tracks.firstIndex(where:{$0.id == radio.track?.id}) ?? 0)+1) + " / " + String($0.tracks.count) } ?? app.t("PIT FM · 等你选台"))
                .sourceFont(6,family:"RobotoCondensed-Black",weight:780).tracking(0.48).foregroundStyle(Color(white:0.7))
            Text(radio.track?.name ?? app.t("先选一对 CP")).sourceFont(11,weight:700).lineLimit(2).foregroundStyle(.white)
        }.padding(.leading,30).padding(.trailing,14).padding(.vertical,4)
            .frame(width:machineW * 820/1535,height:machineH * 220/1024,alignment:.leading)
            .modifier(RadioScreenProjection(width:machineW,height:machineH))
    }
    func stationSticker(_ value:Station,index:Int)->some View {
        let positions:[(CGFloat,CGFloat,CGFloat,Double)]=[(0.71,0.60,0.22,4),(0.71,-0.04,0.28,5),(0.10,-0.10,0.242,-5),(0.005,0.62,0.22,-6)]
        let p=positions[min(index,3)], selected=value.id==radio.stationID
        return Button {radio.select(value)} label: {
            LocalArtwork(source:value.artwork).frame(width:machineW*p.2)
                .saturation(selected ? 1:0.12).contrast(selected ? 1:1.05)
                .overlay(alignment:.bottomLeading) {
                    Text(String(value.tracks.count) + " " + app.t("首歌")).sourceFont(10,family:"RobotoCondensed-Black",weight:750)
                        .padding(.horizontal,4).padding(.vertical,2).background(selected ? Pit.pink:Pit.ink).foregroundStyle(selected ? Pit.ink:.white).padding(2)
                }.shadow(color:selected ? Pit.pink:.clear,radius:0,x:2,y:2)
        }.buttonStyle(SourceButtonStyle()).rotationEffect(.degrees(p.3)).offset(x:machineW*p.0,y:machineH*p.1)
            .draggable(value.id).accessibilityIdentifier("station-"+value.id).accessibilityLabel(value.name + " · " + String(value.tracks.count) + app.t("首歌"))
    }
    var controls: some View {
        HStack(spacing:10) {
            HStack(spacing:4) {
                control("SkipBack",label:"上一首歌",weight:"fill",disabled:(station?.tracks.count ?? 0)<2) {radio.previous()}
                control(radio.wantsPlayback ? "Pause":"Play",label:radio.wantsPlayback ? "暂停":"落针播放",weight:"fill",disabled:radio.track==nil) {radio.toggle()}
                control("SkipForward",label:"下一首歌",weight:"fill",disabled:(station?.tracks.count ?? 0)<2) {radio.next()}
            }
            HStack(spacing:4) {
                control(radio.repeatOne ? "RepeatOnce":"ListNumbers",label:"循环",selected:radio.repeatOne,disabled:radio.track==nil) {radio.repeatOne.toggle()}
                control("Playlist",label:"歌单",selected:playlist,disabled:radio.track==nil) {playlist=true}
            }
        }.fixedSize(horizontal:true,vertical:false).padding(.horizontal,10).padding(.vertical,6).background(Pit.ink).overlay(RoundedRectangle(cornerRadius:8).stroke(Color(white:0.16),lineWidth:1)).clipShape(RoundedRectangle(cornerRadius:8))
    }
    func control(_ icon:String,label:String,weight:String="bold",selected:Bool=false,disabled:Bool=false,action:@escaping()->Void)->some View {
        Button(action:action) { SourceIcon(icon,weight:weight,size:20).frame(width:44,height:44).background(selected ? Pit.pink.opacity(0.1):.clear).foregroundStyle(selected ? Pit.pink:.white) }
            .buttonStyle(SourceButtonStyle()).disabled(disabled).opacity(disabled ? 0.35:1).accessibilityLabel(app.t(label)).accessibilityIdentifier("radio-"+icon)
    }
    var playlistSheet: some View {
        VStack(spacing:0) {
            Rectangle().fill(Pit.pink).frame(height:4)
            HStack(spacing:12) {
                if let station {LocalArtwork(source:station.artwork).frame(width:48,height:56)}
                VStack(alignment:.leading,spacing:5) {Text("PIT FM / TRACK LIST").sourceFont(11,weight:750).foregroundStyle(Pit.pink);Text(station?.name ?? "PIT FM").sourceFont(16,weight:800)}
                Spacer(minLength:0)
                Button {playlist=false} label:{SourceIcon("X",size:18).frame(width:44,height:44)}.accessibilityLabel(app.t("关闭歌单"))
            }.padding(.leading,18).padding(.vertical,8)
            Divider()
            ScrollView {
                LazyVStack(spacing:0) {
                    ForEach(Array((station?.tracks ?? []).enumerated()),id:\.element.id) { i,track in
                        Button {if let station {radio.select(station,track:track)};playlist=false} label: {
                            HStack(spacing:8) {
                                Text(String(format:"%02d",i+1)).sourceFont(10,family:"RobotoCondensed-Black",weight:750).frame(width:18)
                                VStack(alignment:.leading,spacing:3) {Text(track.name).sourceFont(13,weight:750).multilineTextAlignment(.leading);Text(track.artists.joined(separator:" / ")).sourceFont(11).foregroundStyle(.secondary)}
                                Spacer(minLength:0)
                                if radio.track?.id==track.id {SourceIcon("SpeakerHigh",weight:"fill",size:16).foregroundStyle(Pit.pink)}
                            }.padding(.horizontal,6).padding(.vertical,8).frame(minHeight:60).background(radio.track?.id==track.id ? Pit.pink.opacity(0.1):.clear)
                                .overlay(alignment:.leading) {if radio.track?.id==track.id {Rectangle().fill(Pit.pink).frame(width:3)}}
                        }.buttonStyle(SourceButtonStyle())
                        Divider()
                    }
                }.padding(.horizontal,18).padding(.top,8).padding(.bottom,18)
            }
        }.background(Pit.paper)
    }
}

struct RadioGuideArrow: Shape {
    func path(in r:CGRect)->Path {
        var p=Path();p.move(to:CGPoint(x:3,y:37));p.addCurve(to:CGPoint(x:75,y:27),control1:CGPoint(x:32,y:38),control2:CGPoint(x:57,y:39));p.addCurve(to:CGPoint(x:92,y:4),control1:CGPoint(x:84,y:21),control2:CGPoint(x:89,y:13));p.move(to:CGPoint(x:82,y:7));p.addLines([CGPoint(x:92,y:4),CGPoint(x:93,y:14)])
        return p.applying(.init(scaleX:r.width/100,y:r.height/44))
    }
}
struct RadioNeedleHit: Shape {
    func path(in r:CGRect)->Path {Path {p in p.addLines([(0.48,0.0),(1,0),(0.88,0.55),(0.62,1),(0.18,0.91),(0,0.72),(0.33,0.52)].map{CGPoint(x:$0.0*r.width,y:$0.1*r.height)});p.closeSubpath()}}
}
/// The same four-corner homography used by useProjectedPlayer.js.
struct RadioScreenProjection: GeometryEffect {
    let width:CGFloat;let height:CGFloat
    func effectValue(size:CGSize)->ProjectionTransform {
        let sx=width/1535,sy=height/1024
        let corners:[CGPoint]=[.init(x:295*sx+5,y:586*sy-5),.init(x:985*sx+15,y:714*sy-5),.init(x:918*sx+15,y:884*sy+5),.init(x:229*sx+5,y:744*sy+5)]
        let src:[CGPoint]=[.zero,.init(x:size.width,y:0),.init(x:size.width,y:size.height),.init(x:0,y:size.height)]
        var a=[[CGFloat]]()
        for i in 0..<4 {let x=src[i].x,y=src[i].y,u=corners[i].x,v=corners[i].y;a.append([x,y,1,0,0,0,-u*x,-u*y,u]);a.append([0,0,0,x,y,1,-v*x,-v*y,v])}
        for c in 0..<8 {
            let pivot=(c..<8).max(by:{abs(a[$0][c])<abs(a[$1][c])})!
            a.swapAt(c,pivot);let d=a[c][c];if abs(d)<1e-9 {return ProjectionTransform()}
            for j in c...8 {a[c][j]/=d}
            for r in 0..<8 where r != c {let f=a[r][c];for j in c...8 {a[r][j]-=f*a[c][j]}}
        }
        let v=a.map{$0[8]};var m=CATransform3DIdentity
        m.m11=v[0];m.m21=v[1];m.m41=v[2];m.m12=v[3];m.m22=v[4];m.m42=v[5];m.m14=v[6];m.m24=v[7]
        return ProjectionTransform(m)
    }
}
struct RadioHelp: View {
    @EnvironmentObject var app:AppModel
    @Environment(\.sourceViewport) var viewport
    let close:()->Void
    let items=[("选一对 CP","点一下贴纸，也可以拖入唱片"),("落针，开始听","点播放或唱针，也可以拖动唱针"),("换首她们的歌","点下一首，或点列表图标选歌")]
    var width:CGFloat {min(320,viewport.width-80)}
    var body:some View {
        Group {
            if app.locale=="zh" {
                GeometryReader {g in
                    ForEach(0..<3) {i in
                        step(i).frame(width:g.size.width*0.63,alignment:.leading)
                            .offset(x:g.size.width*0.28,y:g.size.height*[0.278,0.501,0.728][i])
                    }
                }.aspectRatio(4/5,contentMode:.fit)
            } else {
                VStack(alignment:.leading,spacing:22) {ForEach(0..<3) {step($0)}}
                    .padding(.top,88).padding(.bottom,40).padding(.leading,width*0.28).padding(.trailing,width*0.09)
                    .frame(minHeight:380)
            }
        }.background {SourceTexture("assets/pit-radio/how-to-paper-blank.webp").scaleEffect(1.2).mask(SourceTexture("assets/pit-radio/how-to-paper-v3.webp"))}
            .overlay(alignment:.topLeading) {
                Text(app.t("怎么玩")).sourceFont(21,family:"RobotoCondensed-Black",weight:900).foregroundStyle(Pit.pink).rotationEffect(.degrees(-3))
                    .padding(.leading,width*0.14).padding(.top,app.locale=="zh" ? width*0.125:32)
            }
            .overlay(alignment:.topTrailing) {Button(action:close) {SourceIcon("X",size:20).frame(width:44,height:44)}.rotationEffect(.degrees(-12)).padding(.top,14).padding(.trailing,24).accessibilityLabel(app.t("关闭玩法说明"))}
    }
    func step(_ index:Int)->some View {
        VStack(alignment:.leading,spacing:4) {
            Text(app.t(items[index].0)).sourceFont(15,weight:800).lineSpacing(app.locale=="zh" ? 0:4).fixedSize(horizontal:false,vertical:true)
            Text(app.t(items[index].1)).sourceFont(12,weight:640).lineSpacing(app.locale=="zh" ? 0:3).fixedSize(horizontal:false,vertical:true)
        }.frame(maxWidth:.infinity,alignment:.leading)
            .overlay(alignment:.topLeading) {
                Text(String(format:"%02d",index+1)).sourceFont(15,weight:800).foregroundStyle(Pit.pink).frame(width:24.75,height:24.75)
                    .overlay(Circle().stroke(Pit.pink,lineWidth:1.5)).rotationEffect(.degrees(-8)).offset(x:-24.75-width*0.63*0.05,y:-2)
            }
    }
}
