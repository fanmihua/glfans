import AppKit
import Foundation
import ImageIO

let root = URL(fileURLWithPath: CommandLine.arguments[1])
let destination = root.appendingPathComponent("ios/Glfans/Assets.xcassets/AppIcon.appiconset")
try FileManager.default.createDirectory(at: destination, withIntermediateDirectories: true)
let context = CGContext(data: nil, width: 1024, height: 1024, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: false)
NSColor(calibratedRed: 0.97, green: 0.95, blue: 0.92, alpha: 1).setFill()
NSRect(x: 0, y: 0, width: 1024, height: 1024).fill()
if let image = NSImage(contentsOf: root.appendingPathComponent("public/assets/gl-pit-favicon.png")) {
    image.draw(in: NSRect(x: 140, y: 140, width: 744, height: 744))
} else {
    let label = "glfans" as NSString
    label.draw(at: NSPoint(x: 130, y: 400), withAttributes: [.font: NSFont.systemFont(ofSize: 210, weight: .black), .foregroundColor: NSColor.black])
}
NSGraphicsContext.restoreGraphicsState()
let imageDestination = CGImageDestinationCreateWithURL(destination.appendingPathComponent("AppIcon.png") as CFURL, "public.png" as CFString, 1, nil)!
CGImageDestinationAddImage(imageDestination, context.makeImage()!, nil)
guard CGImageDestinationFinalize(imageDestination) else { fatalError("图标导出失败") }
let json = #"{"images":[{"filename":"AppIcon.png","idiom":"universal","platform":"ios","size":"1024x1024"}],"info":{"author":"xcode","version":1}}"#
try Data(json.utf8).write(to: destination.appendingPathComponent("Contents.json"))
try Data(#"{"info":{"author":"xcode","version":1}}"#.utf8).write(to: destination.deletingLastPathComponent().appendingPathComponent("Contents.json"))
