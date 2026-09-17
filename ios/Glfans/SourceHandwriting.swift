import SwiftUI
import CoreText

/// The website's Xingkai SC system-font face, obtained through Apple's font
/// service when it is not preinstalled. No desktop font is redistributed.
@MainActor final class SourceHandwriting:ObservableObject {
    static let shared=SourceHandwriting()
    @Published private(set) var family="STXingkaiSC-Light"
    private var requested=false
    func prepare() {
        guard !requested else{return};requested=true
        if UIFont(name:family,size:18) != nil {return}
        family=["STKaitiSC-Regular","STKaiti"].first{UIFont(name:$0,size:18) != nil} ?? "Manrope-ExtraLight"
        let descriptor=CTFontDescriptorCreateWithAttributes([kCTFontNameAttribute:"STXingkaiSC-Light"] as CFDictionary)
        CTFontDescriptorMatchFontDescriptorsWithProgressHandler([descriptor] as CFArray,nil) {state,_ in
            if state == .didFinish {
                Task {@MainActor in
                    if UIFont(name:"STXingkaiSC-Light",size:18) != nil {self.family="STXingkaiSC-Light"}
                }
            }
            return true
        }
    }
}
