#if DEBUG
import SwiftUI

/// Local QA only. Captures real UIKit/SwiftUI rendering at the source viewport;
/// the shipping UI never uses a screenshot as its interface.
struct HomeSnapshotExport: UIViewRepresentable {
    let enabled: Bool
    let name: String
    let size: CGSize
    func makeUIView(context: Context) -> HomeSnapshotProbe { HomeSnapshotProbe() }
    func updateUIView(_ view: HomeSnapshotProbe, context: Context) {
        guard enabled, view.lastName != name else { return }
        view.lastName = name
        DispatchQueue.main.asyncAfter(deadline: .now()+(name.hasPrefix("page-") ? 2.5 : 1)) { [weak view] in
            guard let view, let window = view.window else { return }
            let origin = view.convert(CGPoint.zero,to:window)
            let format = UIGraphicsImageRendererFormat(); format.scale = 2
            let renderer = UIGraphicsImageRenderer(size:size,format:format)
            let image = renderer.image { context in
                context.cgContext.translateBy(x:-origin.x,y:-origin.y)
                window.drawHierarchy(in:window.bounds,afterScreenUpdates:true)
            }
            let docs = FileManager.default.urls(for:.documentDirectory,in:.userDomainMask)[0]
            try? image.pngData()?.write(to:docs.appendingPathComponent("home-\(name).png"))
            let metrics: [String:Any] = ["fonts":UIFont.familyNames.filter{ $0.localizedCaseInsensitiveContains("kai") || $0.localizedCaseInsensitiveContains("song") }.map { [$0:UIFont.fontNames(forFamilyName:$0)] },"family":UIFont(name:"AlibabaPuHuiTi-Heavy",size:90)?.familyName ?? "MISSING", "origin":"\(origin)","size":"\(size)"]
            if let data = try? JSONSerialization.data(withJSONObject:metrics,options:.prettyPrinted) { try? data.write(to:docs.appendingPathComponent("home-snapshot.json")) }
        }
    }
}
final class HomeSnapshotProbe: UIView { var lastName = "" }
#endif
