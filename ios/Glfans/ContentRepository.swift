import Foundation
import GlfansCore

/// Reject cross-origin redirects before a request follows them.
private final class ContentRedirectPolicy: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        guard let url = request.url, (try? ContentManifest.validURL(url.absoluteString)) != nil else { completionHandler(nil); return }
        completionHandler(request)
    }
}

actor ContentRepository {
    static let shared = ContentRepository()
    static let manifestURL = "https://glfans.com/app-content/v1/manifest.json"
    nonisolated static var cache: ContentSnapshotCache {
        ContentSnapshotCache(url: FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("glfans-content-v1.json"))
    }
    nonisolated static var artworkDirectory: URL {
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("glfans-artwork-v1", isDirectory: true)
    }
    private let policy = ContentRedirectPolicy()
    private lazy var session: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.httpMaximumConnectionsPerHost = 4
        config.httpShouldSetCookies = false
        config.httpCookieStorage = nil
        config.urlCredentialStorage = nil
        config.urlCache = nil
        config.timeoutIntervalForRequest = 25
        config.timeoutIntervalForResource = 60
        return URLSession(configuration: config, delegate: policy, delegateQueue: nil)
    }()
    private var imageTasks: [String: Task<Data, Error>] = [:]
    private func fetch(_ string: String, maximumBytes: Int) async throws -> Data {
        let url = try ContentManifest.validURL(string)
        let request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 25)
        let (stream, response) = try await session.bytes(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200,
              let finalURL = http.url, (try? ContentManifest.validURL(finalURL.absoluteString)) != nil,
              response.expectedContentLength <= maximumBytes else { throw ContentValidationError.invalidContent }
        var data = Data(); data.reserveCapacity(min(maximumBytes, max(0, Int(response.expectedContentLength))))
        for try await byte in stream {
            guard data.count < maximumBytes else { throw ContentValidationError.invalidSize }
            data.append(byte)
        }
        return data
    }
    func refresh(currentVersion: String?) async throws -> ContentSnapshot? {
        let manifest = try ContentManifest.decode(await fetch(Self.manifestURL, maximumBytes: ContentManifest.maximumManifestBytes))
        if manifest.version == currentVersion { return nil }
        var files: [String: Data] = [:]
        try await withThrowingTaskGroup(of: (String, Data).self) { group in
            for key in ContentManifest.requiredFiles {
                let file = manifest.files[key]!
                group.addTask { [self] in
                    let data = try await fetch(file.url, maximumBytes: file.bytes)
                    try file.verify(data)
                    return (key, data)
                }
            }
            for try await (key, data) in group { files[key] = data }
        }
        let snapshot = try ContentSnapshot(manifest: manifest, files: files)
        _ = try JSONDecoder().decode(WebsiteContent.self, from: files["sourceContent"]!)
        try Self.cache.save(snapshot)
        return snapshot
    }
    func artwork(_ file: ContentFile) async throws -> Data {
        try file.validate(maxBytes: ContentManifest.maximumAssetBytes)
        let local = Self.artworkDirectory.appendingPathComponent(file.sha256)
        if let data = try? Data(contentsOf: local), (try? file.verify(data)) != nil { return data }
        if let task = imageTasks[file.sha256] { return try await task.value }
        let task = Task { [self] in
            let data = try await fetch(file.url, maximumBytes: file.bytes)
            try file.verify(data)
            try FileManager.default.createDirectory(at: Self.artworkDirectory, withIntermediateDirectories: true)
            try data.write(to: local, options: .atomic)
            return data
        }
        imageTasks[file.sha256] = task
        defer { imageTasks[file.sha256] = nil }
        return try await task.value
    }
}
