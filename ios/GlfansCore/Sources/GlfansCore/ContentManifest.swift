import Foundation
import CryptoKit

public enum ContentValidationError: Error, Equatable { case invalidManifest, invalidURL, invalidDigest, invalidSize, missingFile, invalidContent }

public struct ContentFile: Codable, Sendable, Equatable {
    public let url: String
    public let sha256: String
    public let bytes: Int
    public init(url: String, sha256: String, bytes: Int) { self.url = url; self.sha256 = sha256; self.bytes = bytes }
    public func validate(maxBytes: Int) throws {
        guard ContentManifest.isDigest(sha256) else { throw ContentValidationError.invalidDigest }
        guard bytes > 0, bytes <= maxBytes else { throw ContentValidationError.invalidSize }
        let location = try ContentManifest.validURL(url)
        guard location.path.hasPrefix("/assets/app-content/"), location.lastPathComponent.hasPrefix(sha256 + ".") else { throw ContentValidationError.invalidURL }
    }
    public func verify(_ data: Data) throws {
        guard data.count == bytes else { throw ContentValidationError.invalidSize }
        guard ContentManifest.digest(data) == sha256 else { throw ContentValidationError.invalidDigest }
    }
}

public struct ContentManifest: Codable, Sendable {
    public let schemaVersion: Int
    public let version: String
    public let generatedAt: String
    public let sourceCommit: String
    public let files: [String: ContentFile]
    public let assets: [String: ContentFile]
    public static let requiredFiles = ["catalog", "cpCatalog", "schedule", "en", "th", "calendarZh", "calendarEn", "calendarTh", "sourceContent"]
    public static let filenames = ["catalog": "catalog.json", "cpCatalog": "cp-catalog.json", "schedule": "schedule.json", "en": "en.json", "th": "th.json", "calendarZh": "calendar-zh.json", "calendarEn": "calendar-en.json", "calendarTh": "calendar-th.json", "sourceContent": "source-content.json"]
    public static let maximumManifestBytes = 4 * 1024 * 1024
    public static let maximumJSONBytes = 24 * 1024 * 1024
    public static let maximumAssetBytes = 24 * 1024 * 1024
    public init(schemaVersion: Int = 1, version: String, generatedAt: String, sourceCommit: String, files: [String: ContentFile], assets: [String: ContentFile]) {
        self.schemaVersion = schemaVersion; self.version = version; self.generatedAt = generatedAt; self.sourceCommit = sourceCommit; self.files = files; self.assets = assets
    }
    public static func digest(_ data: Data) -> String { SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined() }
    public static func isDigest(_ value: String) -> Bool { value.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil }
    public static func validURL(_ string: String) throws -> URL {
        guard let url = URL(string: string), let c = URLComponents(url: url, resolvingAgainstBaseURL: false),
              c.scheme == "https", c.host == "glfans.com", c.port == nil || c.port == 443,
              c.user == nil, c.password == nil, c.fragment == nil, c.query == nil,
              !c.percentEncodedPath.contains("%"), !url.pathComponents.contains("..") else { throw ContentValidationError.invalidURL }
        return url
    }
    public func validate() throws {
        guard schemaVersion == 1, Self.isDigest(version), !sourceCommit.isEmpty,
              CalendarRules.timestamp(generatedAt) != nil, Set(Self.requiredFiles).isSubset(of: Set(files.keys)), files.count <= 24,
              assets.count <= 10_000 else { throw ContentValidationError.invalidManifest }
        for file in files.values { try file.validate(maxBytes: Self.maximumJSONBytes) }
        guard files.values.reduce(0, { $0 + $1.bytes }) <= 64 * 1024 * 1024 else { throw ContentValidationError.invalidSize }
        for (key, file) in assets {
            guard key.hasPrefix("assets/"), !key.contains("\\"), !key.contains("%"), !key.split(separator: "/").contains("..") else { throw ContentValidationError.invalidURL }
            try file.validate(maxBytes: Self.maximumAssetBytes)
        }
    }
    public static func decode(_ data: Data) throws -> ContentManifest {
        guard data.count <= maximumManifestBytes else { throw ContentValidationError.invalidSize }
        let result = try JSONDecoder().decode(Self.self, from: data); try result.validate(); return result
    }
}

/// A release is accepted as one unit, including translations. Partial downloads never become visible.
public struct ContentSnapshot: Sendable {
    public let manifest: ContentManifest
    public let catalog: Catalog
    public let cpCatalog: CpCatalog
    public let schedule: BroadcastSchedule
    public let dictionaries: [String: [String: String]]
    public let calendarDictionaries: [String: [String: String]]
    public let files: [String: Data]
    public init(manifest: ContentManifest, files: [String: Data]) throws {
        try manifest.validate()
        for key in ContentManifest.requiredFiles {
            guard let data = files[key], let file = manifest.files[key] else { throw ContentValidationError.missingFile }
            try file.verify(data)
        }
        let decoder = JSONDecoder()
        let catalog = try Catalog.decode(files["catalog"]!)
        let rawCatalog = try JSONSerialization.jsonObject(with: files["catalog"]!) as? [String: Any]
        let rawCollections = rawCatalog?["collections"] as? [[String: Any]]
        guard let rawCollections, rawCollections.allSatisfy({ ($0["hidden"] as? Bool) != true }) else { throw ContentValidationError.invalidContent }
        let cp = try CpCatalog.decode(files["cpCatalog"]!)
        let schedule = try decoder.decode(BroadcastSchedule.self, from: files["schedule"]!)
        guard !catalog.dramas.isEmpty, !cp.profiles.isEmpty, !schedule.series.isEmpty, !schedule.events.isEmpty,
              Self.unique(catalog.dramas.map(\.id)), Self.unique(cp.profiles.map(\.id)), Self.unique(schedule.series.map(\.id)), Self.unique(schedule.events.map(\.id)),
              Self.unique(catalog.collections.map(\.id)), catalog.collections.allSatisfy({ Self.unique($0.articles.map(\.id)) && $0.articles.allSatisfy { $0.hidden != true } }),
              catalog.quotes.isEmpty, catalog.radio.tracks.isEmpty, catalog.homeCards.isEmpty,
              catalog.homeLinks.allSatisfy({ ["archive", "cp", "column", "repo", "memes", "about"].contains($0.id) }),
              cp.profiles.allSatisfy({ $0.id == $0.detail.cp.id && $0.detail.community == nil && $0.detail.cp.shops.isEmpty }) else { throw ContentValidationError.invalidContent }
        let dictionaries = try ["en": decoder.decode([String: String].self, from: files["en"]!), "th": decoder.decode([String: String].self, from: files["th"]!)]
        let calendars = try ["zh": decoder.decode([String: String].self, from: files["calendarZh"]!), "en": decoder.decode([String: String].self, from: files["calendarEn"]!), "th": decoder.decode([String: String].self, from: files["calendarTh"]!)]
        guard dictionaries.values.allSatisfy({ !$0.isEmpty }), calendars.values.allSatisfy({ !$0.isEmpty }),
              try JSONSerialization.jsonObject(with: files["sourceContent"]!) is [String: Any] else { throw ContentValidationError.invalidContent }
        self.manifest = manifest; self.catalog = catalog; cpCatalog = cp; self.schedule = schedule
        self.dictionaries = dictionaries; calendarDictionaries = calendars; self.files = files
    }
    private static func unique(_ values: [String]) -> Bool { !values.contains("") && Set(values).count == values.count }
}

/// One atomic cache file also serves as the activation pointer; corrupt/incomplete releases cannot replace it.
public struct ContentSnapshotCache {
    private struct Archive: Codable { let manifest: ContentManifest; let files: [String: Data] }
    public let url: URL
    public init(url: URL) { self.url = url }
    public func load() throws -> ContentSnapshot {
        let archive = try JSONDecoder().decode(Archive.self, from: Data(contentsOf: url))
        return try ContentSnapshot(manifest: archive.manifest, files: archive.files)
    }
    public func save(_ snapshot: ContentSnapshot) throws {
        let data = try JSONEncoder().encode(Archive(manifest: snapshot.manifest, files: snapshot.files))
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: url, options: .atomic)
    }
}
