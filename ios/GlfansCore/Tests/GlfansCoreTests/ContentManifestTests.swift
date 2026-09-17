import XCTest
@testable import GlfansCore

final class ContentManifestTests: XCTestCase {
    private var generated: URL { URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("Generated") }
    private func fixture() throws -> (ContentManifest, [String: Data]) {
        var data: [String: Data] = [:]
        var files: [String: ContentFile] = [:]
        let preview = ProcessInfo.processInfo.environment["GLFANS_CONTENT_TEST_ROOT"].map { URL(fileURLWithPath: $0) }
        let previewManifest = try preview.map { try ContentManifest.decode(Data(contentsOf: $0.appendingPathComponent("app-content/v1/manifest.json"))) }
        for (key, filename) in ContentManifest.filenames {
            let url: URL
            if let preview, let descriptor = previewManifest?.files[key], let remote = URL(string: descriptor.url) { url = preview.appendingPathComponent(String(remote.path.dropFirst())) }
            else { url = generated.appendingPathComponent(filename) }
            let bytes = try Data(contentsOf: url)
            data[key] = bytes
            let hash = ContentManifest.digest(bytes)
            files[key] = ContentFile(url: "https://glfans.com/assets/app-content/\(hash).json", sha256: hash, bytes: bytes.count)
        }
        return (ContentManifest(version: String(repeating: "a", count: 64), generatedAt: "2026-09-17T00:00:00Z", sourceCommit: "fixture", files: files, assets: [:]), data)
    }
    func testAllPayloadsMustMatchManifestBeforeActivation() throws {
        let (manifest, data) = try fixture()
        let snapshot = try ContentSnapshot(manifest: manifest, files: data)
        XCTAssertFalse(snapshot.catalog.dramas.isEmpty)
        XCTAssertFalse(snapshot.cpCatalog.profiles.isEmpty)
        XCTAssertFalse(snapshot.calendarDictionaries["zh"]!.isEmpty)
        var partial = data; partial.removeValue(forKey: "cpCatalog")
        XCTAssertThrowsError(try ContentSnapshot(manifest: manifest, files: partial)) { XCTAssertEqual($0 as? ContentValidationError, .missingFile) }
        var corrupt = data; corrupt["catalog"]![0] ^= 1
        XCTAssertThrowsError(try ContentSnapshot(manifest: manifest, files: corrupt)) { XCTAssertEqual($0 as? ContentValidationError, .invalidDigest) }
    }
    func testURLsCannotLeaveProductionOriginOrInjectCredentials() throws {
        for value in ["http://glfans.com/a", "https://glfans.com.evil.test/a", "https://u:p@glfans.com/a", "https://glfans.com/a#fragment", "https://glfans.com/a?q=1", "https://glfans.com:444/a", "https://glfans.com/assets/%2e%2e/private", "https://glfans.com/assets/../private", "file:///tmp/a"] {
            XCTAssertThrowsError(try ContentManifest.validURL(value), value)
        }
        XCTAssertNoThrow(try ContentManifest.validURL("https://glfans.com/app-content/v1/manifest.json"))
    }
    func testDigestFilenameAndLengthMustAgree() throws {
        let bytes = Data("content".utf8); let hash = ContentManifest.digest(bytes)
        let valid = ContentFile(url: "https://glfans.com/assets/app-content/\(hash).webp", sha256: hash, bytes: bytes.count)
        XCTAssertNoThrow(try valid.validate(maxBytes: 100))
        XCTAssertNoThrow(try valid.verify(bytes))
        XCTAssertThrowsError(try valid.verify(bytes + Data([0])))
        XCTAssertThrowsError(try valid.validate(maxBytes: 1))
        XCTAssertThrowsError(try ContentFile(url: "https://glfans.com/assets/app-content/other.webp", sha256: hash, bytes: 1).validate(maxBytes: 100))
    }
    func testUnsupportedSchemaAndIncompleteManifestAreRejected() throws {
        let (manifest, _) = try fixture()
        let unsupported = ContentManifest(schemaVersion: 2, version: manifest.version, generatedAt: manifest.generatedAt, sourceCommit: manifest.sourceCommit, files: manifest.files, assets: [:])
        XCTAssertThrowsError(try unsupported.validate())
        let missing = ContentManifest(version: manifest.version, generatedAt: manifest.generatedAt, sourceCommit: manifest.sourceCommit, files: [:], assets: [:])
        XCTAssertThrowsError(try missing.validate())
    }
    func testInvalidAssetKeyCannotTraverseFilesystem() throws {
        let (manifest, _) = try fixture()
        for key in ["../secret", "assets/../secret", "assets/%2e%2e/secret", "assets/a\\b"] {
            let invalid = ContentManifest(version: manifest.version, generatedAt: manifest.generatedAt, sourceCommit: manifest.sourceCommit, files: manifest.files, assets: [key: manifest.files["catalog"]!])
            XCTAssertThrowsError(try invalid.validate(), key)
        }
    }
    func testRemoteContentCannotRestoreHiddenCapabilitiesOrDuplicateIDs() throws {
        let (manifest, original) = try fixture()
        for invalidCase in ["quotes", "hiddenCollection", "duplicateDrama"] {
            var data = original
            var object = try XCTUnwrap(JSONSerialization.jsonObject(with: data["catalog"]!) as? [String: Any])
            if invalidCase == "quotes" { object["quotes"] = [["id": "blocked", "text": "hidden", "speaker": "hidden"]] }
            else if invalidCase == "hiddenCollection" { var collections = try XCTUnwrap(object["collections"] as? [[String: Any]]); collections[0]["hidden"] = true; object["collections"] = collections }
            else { var dramas = try XCTUnwrap(object["dramas"] as? [[String: Any]]); dramas.append(try XCTUnwrap(dramas.first)); object["dramas"] = dramas }
            let bytes = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
            data["catalog"] = bytes
            let hash = ContentManifest.digest(bytes)
            var files = manifest.files
            files["catalog"] = ContentFile(url: "https://glfans.com/assets/app-content/\(hash).json", sha256: hash, bytes: bytes.count)
            let incoming = ContentManifest(version: manifest.version, generatedAt: manifest.generatedAt, sourceCommit: manifest.sourceCommit, files: files, assets: [:])
            XCTAssertThrowsError(try ContentSnapshot(manifest: incoming, files: data)) { XCTAssertEqual($0 as? ContentValidationError, .invalidContent) }
        }
    }

    func testCacheKeepsPreviousCompleteReleaseWhenIncomingPayloadFails() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let cache = ContentSnapshotCache(url: root.appendingPathComponent("content.json"))
        let (manifest, data) = try fixture()
        try cache.save(ContentSnapshot(manifest: manifest, files: data))
        var broken = data; broken["schedule"] = Data()
        XCTAssertThrowsError(try cache.save(ContentSnapshot(manifest: manifest, files: broken)))
        let restored = try cache.load()
        XCTAssertEqual(restored.manifest.version, manifest.version)
        XCTAssertEqual(restored.schedule.events.count, try ContentSnapshot(manifest: manifest, files: data).schedule.events.count)
        XCTAssertEqual(restored.files["en"], data["en"])
    }
}
