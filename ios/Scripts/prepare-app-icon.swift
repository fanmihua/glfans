import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

// Package the exact SiteHeader logo as an opaque iOS icon. Do not redraw the mark
// or enlarge the browser favicon; both would change the shared brand artwork.
let source = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
guard let imageSource = CGImageSourceCreateWithURL(source as CFURL, nil),
      let logo = CGImageSourceCreateImageAtIndex(imageSource, 0, nil),
      let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
      let context = CGContext(data: nil, width: 1024, height: 1024,
                              bitsPerComponent: 8, bytesPerRow: 0, space: colorSpace,
                              bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else {
    fatalError("Cannot load the website logo or create the App icon")
}
// Match src/styles/tokens.css --paper and Pit.paper. iOS supplies the corner mask.
context.setFillColor(CGColor(colorSpace: colorSpace, components: [CGFloat(247)/255, CGFloat(247)/255, CGFloat(244)/255, 1])!)
context.fill(CGRect(x: 0, y: 0, width: 1024, height: 1024))
context.interpolationQuality = .high
context.draw(logo, in: CGRect(x: 102, y: 102, width: 820, height: 820))
guard let image = context.makeImage(),
      let destination = CGImageDestinationCreateWithURL(output as CFURL, UTType.png.identifier as CFString, 1, nil) else {
    fatalError("Cannot encode the App icon")
}
CGImageDestinationAddImage(destination, image, nil)
guard CGImageDestinationFinalize(destination) else { fatalError("Cannot write the App icon") }
print("App icon: SiteHeader logo → 1024×1024 opaque sRGB PNG")
