// swift-tools-version: 5.9
import PackageDescription
let package = Package(
    name: "GlfansCore",
    platforms: [.iOS(.v17), .macOS(.v13)],
    products: [.library(name: "GlfansCore", targets: ["GlfansCore"])],
    targets: [.target(name: "GlfansCore"), .testTarget(name: "GlfansCoreTests", dependencies: ["GlfansCore"])]
)
