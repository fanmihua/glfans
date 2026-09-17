import SwiftUI
import GlfansCore

private enum HomeScene: String { case cover, eyes, falling, welcome }

struct HomeView: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion
    @Environment(\.scenePhase) private var phase
    let catalog: Catalog
    @State private var scene: HomeScene = .cover
    @State private var elapsed: Double = 0
    @State private var seed = UInt32.random(in: .min ... .max)
    @State private var prepared = false
    @State private var frozen = false
    @State private var snapshotSize: CGSize?
    private var reduceMotion: Bool {
        #if DEBUG
        systemReduceMotion || ProcessInfo.processInfo.arguments.contains("--home-reduced-motion")
        #else
        systemReduceMotion
        #endif
    }

    var body: some View {
        GeometryReader { proxy in
            let size = snapshotSize ?? proxy.size
            let g = HomeGeometry(size: size, cards: catalog.homeCards)
            ZStack(alignment: .topLeading) {
                (scene == .falling ? Color(red: 5/255, green: 5/255, blue: 5/255) : Pit.paper)
                if prepared {
                    sceneContent(g)
                        .id(scene)
                        .scaleEffect(scene == .cover || reduceMotion || frozen ? 1 : 1 + 0.035 * (1 - homeEase(min(1,elapsed/0.9),0.2,0.74,0.18,1)))
                        .transition(scene == .cover ? coverTransition(g.h) : .opacity)
                    languageTabs.frame(width: 146, height: 44).position(x: g.w/2, y: 28)
                }
            }
            .frame(width: size.width, height: size.height, alignment: .topLeading)
            .clipped()
            .buttonStyle(SourceButtonStyle())
            .background(Pit.paper.ignoresSafeArea())
            .task {
                // Decode the same six critical images before revealing any scene.
                for card in catalog.homeCards { _ = Artwork.image(card.image) }
                _ = Artwork.image("assets/home/pit-portal-v1.webp")
                _ = Artwork.image("assets/repo-handdrawn-heart-pink.webp")
                configurePreview(); prepared = true
            }
            .task(id: "\(scene.rawValue)-\(phase)-\(prepared)-\(frozen)") {
                guard prepared, phase == .active, !frozen else { return }
                // Monotonic ticks; backgrounding cancels this task and preserves elapsed time.
                let clock = ContinuousClock()
                var previous = clock.now
                while !Task.isCancelled {
                    do { try await Task.sleep(for: .milliseconds(17)) } catch { return }
                    let now = clock.now
                    elapsed += Double(previous.duration(to: now).components.attoseconds) / 1e18 + Double(previous.duration(to: now).components.seconds)
                    previous = now
                    if scene == .eyes && elapsed >= (reduceMotion ? 0.5 : 2.3) { change(.falling); return }
                    if scene == .falling && elapsed >= (reduceMotion ? 0.5 : 1.2) { change(.welcome); return }
                    if scene == .welcome && elapsed >= 0.9 { return }
                }
            }
            #if DEBUG
            .background(HomeSnapshotExport(enabled: frozen && prepared, name: "\(scene.rawValue)-\(app.locale)", size: size))
            #endif
        }
    }

    @ViewBuilder private func sceneContent(_ g: HomeGeometry) -> some View {
        switch scene {
        case .cover: cover(g)
        case .eyes: eyes(g)
        case .falling: falling(g)
        case .welcome: welcome(g)
        }
    }
    private func coverTransition(_ height:CGFloat)->AnyTransition {
        let fade = AnyTransition.opacity.animation(.timingCurve(0.25,0.1,0.25,1,duration:reduceMotion ? 0.001 : 0.62))
        let move = AnyTransition.offset(y:height*0.08).combined(with:.scale(scale:1.12))
            .animation(.timingCurve(0.2,0.74,0.18,1,duration:reduceMotion ? 0.001 : 0.92))
        return .asymmetric(insertion:fade,removal:fade.combined(with:move))
    }
    private func change(_ destination: HomeScene) {
        if destination == .welcome { app.markOpeningComplete() }
        withAnimation(.timingCurve(0.25,0.1,0.25,1,duration:reduceMotion ? 0.001 : destination == .falling ? 0.18 : 0.52)) {
            elapsed = 0; scene = destination
        }
    }
    private func replay() { seed = UInt32.random(in: .min ... .max); change(.cover) }
    private func configurePreview() {
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        func argument(_ key: String) -> String? { guard let i = args.firstIndex(of: key), args.indices.contains(i+1) else { return nil }; return args[i+1] }
        if let value = argument("--home-scene"), let value = HomeScene(rawValue: value) { scene = value }
        if args.contains("--home-snapshot") { frozen = true; elapsed = Double(argument("--home-time") ?? "0") ?? 0; seed = 12345 }
        if let dimensions = argument("--home-size")?.split(separator: "x"), dimensions.count == 2,
           let w = Double(dimensions[0]), let h = Double(dimensions[1]) { snapshotSize = CGSize(width: w, height: h) }
        #endif
    }
    private var languageTabs: some View {
        HStack(spacing: 0) {
            ForEach(Array(zip(["zh","en","th"], ["中","EN","TH"])), id: \.0) { locale, label in
                Button { app.locale = locale } label: {
                    line(label, 11, weight: 700, lh: 15.4, color: app.locale == locale ? Pit.ink : Color(red: 115/255,green: 115/255,blue: 109/255), translate: false)
                        .frame(width: 44, height: 44).contentShape(Rectangle())
                        .background { if app.locale == locale { RoundedRectangle(cornerRadius: 2).fill(Color(red: 1,green: 143/255,blue: 194/255)).padding(.vertical, 10).padding(.horizontal, 1) } }
                }.accessibilityLabel(locale == "zh" ? "中文" : locale == "en" ? "English" : "ไทย")
                    .accessibilityAddTraits(app.locale == locale ? .isSelected : [])
                    .accessibilityIdentifier("home-language-\(locale)")
            }
        }.padding(.horizontal, 3)
            .background(RoundedRectangle(cornerRadius: 4).fill(Color(red: 234/255,green: 234/255,blue: 229/255)).padding(.vertical, 8))
            .padding(.horizontal, 4)
    }
    private var heroFamily: String { app.locale == "th" ? "NotoSansThai-Regular" : "AlibabaPuHuiTi-Heavy" }
    private var bodyFamily: String { app.locale == "th" ? "NotoSansThai-Regular" : "Manrope-ExtraLight" }
    private func line(_ text: String, _ size: CGFloat, weight: CGFloat = 400, kern: CGFloat = 0, lh: CGFloat? = nil, color: Color = Pit.ink, family: String? = nil, translate: Bool = true) -> SourceLine {
        SourceLine(text: translate ? app.t(text) : text, size: size, family: family ?? bodyFamily, weight: weight, kern: app.locale == "th" ? 0 : kern, lineHeight: lh, color: UIColor(color))
    }
    private func chars(_ text: String, size: CGFloat, kern: CGFloat, lineHeight: CGFloat, rotations: [Double], ys: [CGFloat], pink: Set<Int>, bottomOrigin: Bool = false) -> some View {
        HStack(spacing: 0) {
            ForEach(Array(text.enumerated()), id: \.offset) { i, c in
                line(String(c), size, weight: 900, kern: kern, lh: lineHeight, color: pink.contains(i) ? Pit.pink : Pit.ink, family: heroFamily)
                    .offset(y: ys[i]).rotationEffect(.degrees(rotations[i]), anchor: bottomOrigin ? .bottom : .center)
            }
        }.fixedSize().accessibilityElement(children: .ignore).accessibilityLabel(app.t(text)).accessibilityAddTraits(.isStaticText)
    }

    private func cover(_ g: HomeGeometry) -> some View {
        ZStack(alignment: .topLeading) {
            line("glfans", g.w * 0.42, weight: 700, kern: g.w * 0.0042, lh: g.w * 0.42 * 0.86)
                .opacity(0.026).at(x: -g.w * 0.08, y: g.h * 0.05).accessibilityHidden(true)
            NativePitPortal().frame(width: g.portal.width, height: g.portal.height)
                .position(x: g.portal.midX, y: g.portal.midY + g.shift).allowsHitTesting(false)
            coverOrbits(g).offset(y: g.shift).accessibilityHidden(true)
            coverTitle(g)
            ForEach(Array(catalog.homeCards.enumerated()), id: \.element.id) { i, card in
                let rect = g.coverCards()[i]
                Button { change(.eyes) } label: {
                    LocalArtwork(source: card.image).frame(width: rect.width, height: rect.height)
                        .saturation(0.90).contrast(1.04)
                }
                .rotationEffect(.degrees(HomeGeometry.rotations[i]))
                .position(x: rect.midX, y: rect.midY + g.shift + floatOffset(i))
                .accessibilityLabel(app.t("从 \(card.name) 开始入坑片头"))
                .accessibilityIdentifier("home-card-\(card.id)")
            }
            // The visual asset and button are independent layers as in the DOM,
            // so the portal's transparent rectangle cannot cover the CP hit areas.
            Button { change(.eyes) } label: {
                Color.clear.frame(width: g.w, height: g.portal.height * 0.38).contentShape(Rectangle())
            }.position(x: g.w/2, y: g.pitCenter.y + g.shift)
                .accessibilityLabel(app.t("开始入坑片头")).accessibilityIdentifier("home-enter")
            enterMark("ENTER THE PIT", size: 14, replay: false)
                .position(x: g.portal.midX, y: g.portal.minY + g.portal.height * 0.46 + g.shift)
            VStack(spacing: 6) {
                line("版面有限 · 仅展示部分 CP · 坑位持续增加", app.locale == "zh" ? 11 : 10, weight: 800, kern: 0.22, lh: app.locale == "zh" ? 16.5 : 15)
                Rectangle().fill(Pit.pink).frame(height: 2)
            }.fixedSize(horizontal: true, vertical: false)
                .position(x: g.w/2, y: g.h - 12 - (app.locale == "zh" ? 24.5 : 23)/2)
        }.frame(width: g.w, height: g.h, alignment: .topLeading)
    }
    @ViewBuilder private func coverTitle(_ g: HomeGeometry) -> some View {
        let first = min(112, max(76,g.w * 0.23)), second = min(88,max(60,g.w * 0.18))
        if app.locale == "zh" {
            chars("这次", size: first, kern: -3.52, lineHeight: first * 0.73, rotations: [-5,3], ys: [-4,6], pink: [], bottomOrigin: true)
                .at(x: 22 + (g.w-44)*0.015, y: g.h*0.07)
            chars("真的不一样", size: second, kern: -second*0.12, lineHeight: second*0.73, rotations: [-4,2,-2,3,-2], ys: [4,-1,5,-4,3], pink: [0,1], bottomOrigin: true)
                .at(x: 22, y: g.h*0.07 + first*0.73 + second*0.22)
            proof("心动不是感觉，是证据。", size: 14, kern: 1.12, horizontal: 14, top: 8, bottom: 7)
                .at(x: 22 + (g.w-44)*0.10, y: g.h*0.07 + first*0.73 + second*0.95 + 24)
        } else {
            let s1 = min(60,max(36,g.w*0.11)), s2 = min(58,max(35,g.w*0.106)), leading = app.locale == "th" ? 1.4 : 1.15
            VStack(spacing: s2*0.14) {
                line("这次", s1, weight: 900, kern: 0, lh: s1*leading, family: heroFamily).rotationEffect(.degrees(-2)).offset(x:(g.w-40)*0.015/2)
                line("真的不一样", s2, weight: 900, kern: 0, lh: s2*leading, color: Pit.pink, family: heroFamily).rotationEffect(.degrees(-2))
            }.frame(width: g.w-40).at(x:20,y:82)
            proof("心动不是感觉，是证据。",size:12,kern:0,horizontal:10,top:6,bottom:6)
                .position(x:g.w/2,y:82+s1*leading+s2*(leading+0.14)+14+15)
        }
    }
    private func proof(_ text: String, size: CGFloat, kern: CGFloat, horizontal: CGFloat, top: CGFloat, bottom: CGFloat, maxWidth: CGFloat = .greatestFiniteMagnitude) -> some View {
        SourceParagraph(source:line(text,size,weight:650,kern:kern,lh:size*1.5,color:.white),maxWidth:maxWidth-horizontal*2)
            .padding(.horizontal,horizontal).padding(.top,top).padding(.bottom,bottom)
            .background(Pit.ink).rotationEffect(.degrees(-5)).fixedSize()
    }
    private func enterMark(_ text: String, size: CGFloat, replay: Bool) -> some View {
        Button { if replay { self.replay() } else { change(.eyes) } } label: {
            VStack(spacing: 7) {
                line(text,size,weight:replay ? 800 : 700,kern:replay ? 1.76 : size*0.12,lh:replay ? 15.4 : size*1.4,color:.white)
                SourceArrow(down:true).frame(width:replay ? 18 : 20,height:replay ? 18 : 20).foregroundStyle(.white)
            }.padding(.horizontal,replay ? 12 : 14).padding(.top,replay ? 8 : 10).padding(.bottom,replay ? 7 : 9)
                .background(Pit.ink).background(Pit.pink.offset(x:5,y:5))
        }.rotationEffect(.degrees(-2))
            .accessibilityLabel(app.t(replay ? "再次入新坑，重看开场" : "开始入坑片头"))
            .accessibilityIdentifier(replay ? "home-replay" : "home-enter-label")
    }
    private func floatOffset(_ index: Int) -> CGFloat {
        guard !reduceMotion, !frozen else { return 0 }
        let phase = elapsed.truncatingRemainder(dividingBy:5.8)/2.9
        return -8 * homeEase(phase <= 1 ? phase : 2-phase,0.42,0,0.58,1)
    }
    private func coverOrbits(_ g: HomeGeometry) -> some View {
        Canvas { context,size in
            for (i,r) in g.coverCards().enumerated() {
                let start = CGPoint(x:r.midX,y:r.minY+r.height*0.78), end = g.pitCenter, dy = end.y-start.y
                var path = Path();path.move(to:start)
                path.addCurve(to:end,control1:CGPoint(x:start.x+(start.x >= end.x ? 1 : -1)*r.width*0.3,y:start.y+dy*0.35),control2:CGPoint(x:end.x+(start.x-end.x)*0.4,y:end.y-dy*0.16))
                context.stroke(path,with:.color(i%2 == 0 ? Pit.ink.opacity(0.28) : Pit.pink.opacity(0.64)),style:StrokeStyle(lineWidth:1.25,dash:[3,7],dashPhase:reduceMotion ? 0 : -elapsed*10))
            }
        }.mask(EllipticalFade(center:g.pitCenter,radius:CGSize(width:g.w*0.3,height:g.h*0.12),stops:[.init(color:.clear,location:0),.init(color:.clear,location:0.52),.init(color:.black.opacity(0.22),location:0.68),.init(color:.black,location:1)]))
    }

    private func eyes(_ g: HomeGeometry) -> some View {
        let s1 = min(84,max(62,g.w*0.19)), s2 = min(126,max(94,g.w*0.28))
        return ZStack(alignment:.topLeading) {
            if app.locale == "zh" {
                chars("两眼一闭",size:s1,kern:-2.88,lineHeight:s1*0.72,rotations:[-7,3,-2,6],ys:[-5,5,-2,6],pink:[1]).at(x:22,y:g.h*0.08)
                line("就是磕",s2,weight:900,kern:-2.88,lh:s2*0.72,color:Pit.pink,family:heroFamily)
                    .rotationEffect(.degrees(-4)).at(x:22+s2*0.12,y:g.h*0.08+s1*0.72+s2*0.32)
            } else {
                let size = min(66,max(40,g.w*0.11)), leading = app.locale == "th" ? 1.4 : 1.15
                VStack(alignment:.leading,spacing:size*0.9*0.32) {
                    line("两眼一闭",size,weight:900,kern:0,lh:size*leading,family:heroFamily).offset(y:-5).rotationEffect(.degrees(-7))
                    line("就是磕",size*0.9,weight:900,kern:0,lh:size*0.9*(app.locale == "th" ? 1.4 : 1.2),color:Pit.pink,family:heroFamily).frame(width:g.w-40,alignment:.leading).rotationEffect(.degrees(-4))
                }.at(x:22,y:g.h*0.08)
            }
            LocalArtwork(source:"assets/repo-handdrawn-heart-pink.webp").frame(width:min(60,g.w*0.15)).rotationEffect(.degrees(-10)).at(x:g.w*0.06,y:g.h*0.32).accessibilityHidden(true)
            VStack(alignment:.leading,spacing:0) {
                HStack(spacing:10) { Circle().fill(Pit.pink).frame(width:5,height:5);line("glfans",11,weight:800,kern:1.54,lh:17.6) }
                line("MOMENTS",11,weight:800,kern:1.54,lh:17.6)
            }.at(x:g.w*0.25,y:g.h*0.35+16)
            line("✦",26,color:Pit.pink).rotationEffect(.degrees(12)).at(x:g.w*0.7,y:g.h*0.33).accessibilityHidden(true)
            line("✧",22,color:Pit.pink).rotationEffect(.degrees(-8)).at(x:g.w*0.51,y:g.h*0.39).accessibilityHidden(true)
            eyesOrbits(g).accessibilityHidden(true)
            ForEach(0..<4,id:\.self) { i in
                let r = g.eyesCards()[i]
                let progress = reduceMotion || frozen ? 1 : homeEase(min(1,max(0,(elapsed-[0,0.12,0.23,0.32][i])/0.65)),0.18,0.78,0.16,1)
                LocalArtwork(source:catalog.homeCards[i].image).frame(width:r.width,height:r.height)
                    .saturation(0.88).contrast(1.04).rotationEffect(.degrees(reduceMotion ? 0 : [6,-5,5,-7][i]))
                    .opacity(progress).position(x:r.midX,y:r.midY+8*(1-progress)).accessibilityHidden(true)
            }
            proof("“心动不是感觉，是证据。”",size:11,kern:app.locale == "zh" ? 0.88 : 0,horizontal:12,top:8,bottom:8,maxWidth:g.w*0.5).position(x:g.w*0.5,y:g.h*0.68)
        }.frame(width:g.w,height:g.h,alignment:.topLeading)
    }
    private func eyesOrbits(_ g: HomeGeometry) -> some View {
        let r = g.eyesCards(), b = g.eyesGroup
        let centers = r.map { CGPoint(x:$0.midX,y:$0.midY) }
        return Canvas { context,_ in
            var p = Path();p.move(to:centers[3]);p.addCurve(to:centers[1],control1:CGPoint(x:b.minX+b.width*0.02,y:centers[3].y),control2:CGPoint(x:b.minX+b.width*0.02,y:centers[1].y));p.addCurve(to:centers[0],control1:CGPoint(x:b.minX+b.width*0.55,y:centers[1].y),control2:CGPoint(x:b.minX+b.width*0.52,y:centers[0].y))
            context.stroke(p,with:.color(Pit.ink.opacity(0.76)),lineWidth:1.15)
            var dashed = Path();dashed.move(to:centers[0]);dashed.addCurve(to:centers[2],control1:CGPoint(x:b.minX+b.width*0.98,y:centers[0].y),control2:CGPoint(x:b.minX+b.width*0.98,y:centers[2].y));dashed.addCurve(to:centers[3],control1:CGPoint(x:b.minX+b.width*0.55,y:centers[2].y),control2:CGPoint(x:b.minX+b.width*0.52,y:b.minY+b.height*0.98))
            context.stroke(dashed,with:.color(Pit.ink.opacity(0.76)),style:StrokeStyle(lineWidth:1.15,dash:[3,7]))
        }
    }

    private func falling(_ g: HomeGeometry) -> some View {
        let frames = g.coverCards(falling:true), motions = HomeFall.motions(g,seed:seed)
        let cameraT = min(1,elapsed/1.2), camera = reduceMotion ? 1 : 1+0.82*homeEase(cameraT,0.333,0.133,0.667,0.533)
        return ZStack(alignment:.topLeading) {
            NativePitPortal(falling:true).frame(width:g.portal.width,height:g.portal.height).position(x:g.portal.midX,y:g.portal.midY)
            if !reduceMotion {
                ForEach(Array(catalog.homeCards.enumerated()),id:\.element.id) { i,card in
                    let t = min(1,elapsed/motions[i].duration), eased = fallEasing(t,speed:motions[i].initialSpeed)
                    let point = motions[i].curve.atDistance(eased)
                    LocalArtwork(source:card.image).frame(width:frames[i].width,height:frames[i].height)
                        .rotationEffect(.degrees(HomeGeometry.rotations[i]+(motions[i].rotation-HomeGeometry.rotations[i])*eased))
                        .scaleEffect(1-0.97*eased).opacity(t<0.62 ? 1 : (1-t)/0.38).position(point)
                }
            }
        }.frame(width:g.w,height:g.h,alignment:.topLeading)
            .scaleEffect(camera,anchor:UnitPoint(x:g.pitCenter.x/g.w,y:g.pitCenter.y/g.h))
            .opacity(reduceMotion || cameraT<0.62 ? 1 : (1-cameraT)/0.38).offset(y:g.shift)
            .accessibilityElement(children:.ignore).accessibilityLabel(app.t("坠入坑底的转场"))
    }
    private func fallEasing(_ t:Double,speed:Double)->Double { homeEase(t,0.333,speed/3,0.667,(1+speed)/3) }

    private func welcome(_ g: HomeGeometry) -> some View {
        let group = g.welcomeGroup, pw = group.width*1.24
        let portal = CGRect(x:g.w/2-pw/2,y:group.minY+group.height*0.72-pw*0.75*0.61,width:pw,height:pw*0.75)
        let cardW = min(group.width*0.32,group.height*0.55,146), markY = group.minY+max(44,group.height*0.17)
        let linksHeight = 38 + CGFloat(Int(ceil(Double(catalog.homeLinks.count) / 2.0))) * 44
        return ZStack(alignment:.topLeading) {
            line("Love is not a feeling. It's Evidence.",11,lh:16.5,color:Pit.pink,family:app.locale == "th" ? bodyFamily : "BradleyHandITCTT-Bold",translate:false).position(x:g.w/2,y:44+8.25)
            welcomeTitle(g).zIndex(6)
            NativePitPortal().frame(width:portal.width,height:portal.height).position(x:portal.midX,y:portal.midY).allowsHitTesting(false)
            welcomeOrbit(g,start:CGPoint(x:g.w/2,y:markY+56),end:CGPoint(x:g.w/2,y:group.minY+group.height*0.72))
            LocalArtwork(source:catalog.homeCards[0].image).frame(width:cardW,height:cardW).rotationEffect(.degrees(-5)).at(x:group.minX+group.width*0.02,y:group.minY+group.height*0.44).accessibilityHidden(true)
            LocalArtwork(source:catalog.homeCards[4].image).frame(width:cardW,height:cardW).rotationEffect(.degrees(5)).at(x:group.maxX-group.width*0.02-cardW,y:group.minY+group.height*0.32).accessibilityHidden(true)
            enterMark("再次入新坑 ",size:11,replay:true).position(x:g.w/2,y:markY+28).zIndex(8)
            welcomeLinks.frame(width:g.w-44,height:linksHeight).at(x:22,y:g.h-48-linksHeight).zIndex(10)
        }.frame(width:g.w,height:g.h,alignment:.topLeading)
    }
    @ViewBuilder private func welcomeTitle(_ g:HomeGeometry)->some View {
        let first = min(78,max(58,g.w*0.18)), second = min(136,max(104,g.w*0.31)), period = min(92,max(72,g.w*0.21))
        if app.locale == "zh" {
            line("欢迎来到",first,weight:900,kern:-2.64,lh:first*0.76,family:heroFamily)
                .frame(width:g.w-44,alignment:.leading).rotationEffect(.degrees(-2)).at(x:g.w*0.115,y:g.h*0.12+16)
            HStack(alignment:.top,spacing:0) {
                line("坑底",second,weight:900,kern:-2.64,lh:second*0.76,color:Pit.pink,family:heroFamily).rotationEffect(.degrees(3)).offset(y:second*0.06)
                line("。",period,weight:900,kern:-2.64,lh:period*0.76,family:heroFamily).rotationEffect(.degrees(-4)).offset(y:-period*0.08+(second-period)*0.76)
            }.fixedSize().at(x:g.w*0.115,y:g.h*0.12+16+first*0.76)
        } else {
            let s1 = min(46,max(30,g.w*0.08)), s2 = min(62,max(40,g.w*0.11)), leading = app.locale == "th" ? 1.4 : 1.2
            VStack(alignment:.leading,spacing:0) {
                line("欢迎来到",s1,weight:900,kern:0,lh:s1*leading,family:heroFamily).frame(width:g.w-40,alignment:.leading).rotationEffect(.degrees(-2))
                line("坑底",s2,weight:900,kern:0,lh:s2*leading,color:Pit.pink,family:heroFamily).rotationEffect(.degrees(3)).offset(y:s2*0.06)
            }.at(x:20,y:g.h*0.12+16)
        }
    }
    private var welcomeLinks: some View {
        let links = catalog.homeLinks
        let rows = Int(ceil(Double(links.count) / 2.0))
        return VStack(spacing:0) {
            HStack {
                line("坑底索引",app.locale == "zh" ? 14 : 13,weight:700,lh:app.locale == "zh" ? 16.1 : 19.5,family:app.locale == "th" ? bodyFamily : "RobotoCondensed-Regular")
                Spacer()
                line("CONTENTS / \(String(format: "%02d", links.count))",8,kern:1.12,lh:8,color:Pit.pink,family:app.locale == "th" ? bodyFamily : "RobotoCondensed-Regular", translate: false)
            }.frame(height:38).overlay(alignment:.top){ Rectangle().fill(Pit.ink).frame(height:1) }
            ForEach(0..<rows,id:\.self) { row in
                HStack(spacing:0) {
                    ForEach(0..<2,id:\.self) { col in
                        let i = row*2+col
                        if i < links.count {
                            let item = links[i]
                            Button { navigate(item) } label: {
                                HStack(spacing:8) {
                                    line(String(format:"%02d",i+1),14,weight:500,kern:0.28,lh:14,color:Pit.pink,family:app.locale == "th" ? bodyFamily : "RobotoCondensed-Regular", translate:false)
                                    line(item.label,app.locale == "zh" ? 14 : 13,weight:700,lh:app.locale == "zh" ? 16.1 : 19.5,family:app.locale == "th" ? bodyFamily : "RobotoCondensed-Regular")
                                    Spacer(minLength:0)
                                    SourceArrow().frame(width:15,height:15)
                                }.padding(.horizontal,9).frame(maxWidth:.infinity).frame(height:44).contentShape(Rectangle())
                            }.accessibilityLabel(app.t(item.label)).accessibilityIdentifier("home-link-\(item.id)")
                                .overlay(alignment:.top){ Rectangle().fill(Pit.ink).frame(height:1) }
                                .overlay(alignment:.leading){ if col == 1 { Rectangle().fill(Pit.ink).frame(width:1) } }
                                .overlay(alignment:.bottom){ if row == rows-1 { Rectangle().fill(Pit.ink).frame(height:1) } }
                        } else { Color.clear.frame(maxWidth:.infinity).frame(height:44) }
                    }
                }
            }
        }
    }
    private func navigate(_ link:HomeLink) {
        if link.id == "about" { app.enter(.about);return }
        let map:[String:AppSection] = ["archive":.archive,"cp":.cp,"tide-words":.literature,"column":.repo,"memes":.memes,"radio":.radio]
        if let section = map[link.id] { app.enter(section) }
    }
    private func welcomeOrbit(_ g:HomeGeometry,start:CGPoint,end:CGPoint)->some View {
        Canvas { context,_ in
            let dy = max(24,end.y-start.y), w = g.welcomeGroup.width
            let c1 = CGPoint(x:start.x+w*0.16,y:start.y+dy*0.22), c2 = CGPoint(x:end.x+w*0.12,y:end.y-dy*0.32)
            var p = Path();p.move(to:start);p.addCurve(to:end,control1:c1,control2:c2)
            context.stroke(p,with:.color(Pit.pink),lineWidth:1.5)
            // Original SVG marker M 0 0 L 10 5 L 0 10 z, 5x5, refX 8.
            let angle = atan2(end.y-c2.y,end.x-c2.x)
            var marker = Path();marker.move(to:CGPoint(x:-6,y:-3.75));marker.addLine(to:CGPoint(x:1.5,y:0));marker.addLine(to:CGPoint(x:-6,y:3.75));marker.closeSubpath()
            marker = marker.applying(CGAffineTransform(rotationAngle:angle).concatenating(CGAffineTransform(translationX:end.x,y:end.y)))
            context.fill(marker,with:.color(Pit.pink))
        }.accessibilityHidden(true)
    }
}

extension View {
    func at(x:CGFloat,y:CGFloat)->some View { fixedSize().frame(maxWidth:.infinity,maxHeight:.infinity,alignment:.topLeading).offset(x:x,y:y) }
}

struct EllipticalFade: View {
    let center: CGPoint
    let radius: CGSize
    let stops: [Gradient.Stop]
    var body: some View {
        Canvas { context,size in
            context.translateBy(x:center.x,y:center.y)
            context.scaleBy(x:radius.width,y:radius.height)
            let rect = CGRect(x:-center.x/radius.width,y:-center.y/radius.height,width:size.width/radius.width,height:size.height/radius.height)
            let circle = CGRect(x:-1,y:-1,width:2,height:2)
            var outside = Path(rect);outside.addEllipse(in:circle)
            context.fill(outside,with:.color(stops.last?.color ?? .clear),style:FillStyle(eoFill:true))
            context.fill(Path(ellipseIn:circle),with:.radialGradient(Gradient(stops:stops),center:.zero,startRadius:0,endRadius:1))
        }
    }
}
struct NativePitPortal: View {
    var falling = false
    private let black = Color(red:5/255,green:5/255,blue:5/255)
    private let fusion = Color(red:247/255,green:246/255,blue:242/255)
    var body: some View {
        GeometryReader { g in
            ZStack {
                if falling {
                    EllipticalFade(center:CGPoint(x:g.size.width*0.5,y:g.size.height*0.61),radius:CGSize(width:g.size.width*0.5,height:g.size.height*0.29),stops:[.init(color:.clear,location:0.54),.init(color:black.opacity(0.52),location:0.78),.init(color:black,location:1)]).blur(radius:18).scaleEffect(1.035)
                } else {
                    EllipticalFade(center:CGPoint(x:g.size.width*0.5,y:g.size.height*0.62),radius:CGSize(width:g.size.width*0.48,height:g.size.height*0.25),stops:[.init(color:.clear,location:0.48),.init(color:fusion.opacity(0.72),location:0.77),.init(color:Pit.paper,location:1)]).blur(radius:18).scaleEffect(1.035)
                }
                LocalArtwork(source:"assets/home/pit-portal-v1.webp")
                    .contrast(falling ? 1.08 : 0.96).saturation(falling ? 1 : 0.75)
                    .colorMultiply(falling ? Color(white:0.9) : .white)
                    .mask(EllipticalFade(center:CGPoint(x:g.size.width*0.5,y:g.size.height*0.61),radius:CGSize(width:g.size.width*0.5,height:g.size.height*0.32),stops:[.init(color:.black,location:0),.init(color:.black,location:0.81),.init(color:.black.opacity(0.86),location:0.88),.init(color:.clear,location:1)]))
                    .blendMode(falling ? .normal : .multiply)
                if falling {
                    EllipticalFade(center:CGPoint(x:g.size.width*0.5,y:g.size.height*0.61),radius:CGSize(width:g.size.width*0.47,height:g.size.height*0.27),stops:[.init(color:.clear,location:0.58),.init(color:black.opacity(0.38),location:0.74),.init(color:black,location:1)])
                }
            }.compositingGroup()
        }.accessibilityHidden(true)
    }
}

private func homeEase(_ time:Double,_ x1:Double,_ y1:Double,_ x2:Double,_ y2:Double)->Double {
    func cubic(_ t:Double,_ a:Double,_ b:Double)->Double { let u=1-t;return 3*u*u*t*a+3*u*t*t*b+t*t*t }
    if time <= 0 { return 0 };if time >= 1 { return 1 }
    var lo=0.0,hi=1.0
    for _ in 0..<16 { let mid=(lo+hi)/2;if cubic(mid,x1,x2)<time {lo=mid}else{hi=mid} }
    return cubic((lo+hi)/2,y1,y2)
}
