import SwiftUI

/// Website mobile dialogs occupy the full window width. A transparent native
/// full-screen presentation avoids UIKit page-sheet side margins on newer iOS.
struct SourceBottomSheet<Content:View>:View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.sourceBottomInset) private var bottomInset
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var fraction:CGFloat=0.84
    var idealHeight:CGFloat?
    @ViewBuilder let content:()->Content
    @State private var keyboardTop:CGFloat = .greatestFiniteMagnitude
    @State private var drag:CGFloat=0
    init(fraction: CGFloat = 0.84, idealHeight: CGFloat? = nil, @ViewBuilder content: @escaping () -> Content) {
        self.fraction = fraction
        self.idealHeight = idealHeight
        self.content = content
    }
    var body:some View {
        GeometryReader {g in
            let keyboard=max(0,g.frame(in:.global).maxY-keyboardTop)
            let available=max(100,g.size.height-keyboard)
            let requestedHeight:CGFloat = if keyboard > 0 {
                idealHeight.map { min($0, available * fraction) } ?? available * fraction
            } else {
                idealHeight ?? g.size.height * fraction
            }
            let panelHeight=min(requestedHeight,available-max(12,g.safeAreaInsets.top))
            ZStack(alignment:.bottom) {
                Color.black.opacity(0.5).contentShape(Rectangle()).onTapGesture {dismiss()}
                    .accessibilityLabel("关闭弹窗").accessibilityAddTraits(.isButton)
                content()
                    .padding(.bottom,keyboard>0 ? 0:max(g.safeAreaInsets.bottom,bottomInset))
                    .frame(width:g.size.width,height:panelHeight,alignment:.top)
                    .clipped()
                    .background(Pit.paper)
                    .offset(y:drag-keyboard)
                    .accessibilityElement(children:.contain)
                    .accessibilityAddTraits(.isModal).accessibilityIdentifier("source-bottom-sheet")
                    .overlay(alignment:.top) {
                        Color.clear.frame(height:8).contentShape(Rectangle())
                            .gesture(DragGesture(minimumDistance:10).onChanged {drag=max(0,$0.translation.height)}.onEnded {
                                if $0.translation.height>80 || $0.predictedEndTranslation.height>180 {dismiss()}
                                else {withAnimation(reduceMotion ? nil:.easeOut(duration:0.18)){drag=0}}
                            })
                    }
            }.frame(width:g.size.width,height:g.size.height)
        // This host owns keyboard avoidance. Letting SwiftUI also subtract the
        // keyboard inset collapses nested scroll views after the panel moves.
        }.ignoresSafeArea()
            .presentationBackground(.clear)
            .onReceive(NotificationCenter.default.publisher(for:UIResponder.keyboardWillChangeFrameNotification)) {note in
                if let frame=note.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect {
                    withAnimation(reduceMotion ? nil:.easeOut(duration:0.25)) {keyboardTop=frame.minY}
                }
            }
            .onReceive(NotificationCenter.default.publisher(for:UIResponder.keyboardWillHideNotification)) {_ in
                withAnimation(reduceMotion ? nil:.easeOut(duration:0.25)) {keyboardTop = .greatestFiniteMagnitude}
            }
    }
}
extension View {
    func sourceSheet(height:CGFloat)->some View {SourceBottomSheet(fraction:1,idealHeight:max(160,height)){self}}
    func sourceSheet(height:CGFloat,keyboardFraction:CGFloat)->some View {SourceBottomSheet(fraction:keyboardFraction,idealHeight:max(160,height)){self}}
    func sourceSheet(fraction:CGFloat)->some View {SourceBottomSheet(fraction:fraction,idealHeight:nil){self}}
}
