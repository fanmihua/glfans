#!/usr/bin/env node
// 验证已部署的真实 HTTPS 内容契约；不启动 App/模拟器、不触碰用户数据或系统网络。
// 用法：node ios/Scripts/verify-live-content.mjs [--output=/absolute/path/report.json]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ios = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = path.join(ios, 'GlfansCore');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'glfans-live-content-'));
const outputArg = process.argv.slice(2).find(argument => argument.startsWith('--output='));
const output = outputArg ? path.resolve(outputArg.slice('--output='.length)) : null;
function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout || `${command} exited ${result.status}`);
  return result.stdout.trim();
}

const source = String.raw`
import Foundation
import ImageIO
import GlfansCore

private struct ProbeError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}
private final class HTTPSPolicy: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        guard let url = request.url, (try? ContentManifest.validURL(url.absoluteString)) != nil else { completionHandler(nil); return }
        completionHandler(request)
    }
}
private final class OfflineProtocol: URLProtocol {
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() { client?.urlProtocol(self, didFailWithError: URLError(.notConnectedToInternet)) }
    override func stopLoading() { }
}
@main private struct LiveContentProbe {
    static let manifestURL = "https://glfans.com/app-content/v1/manifest.json"
    static func fetch(_ url: String, session: URLSession, maximumBytes: Int, expectsJSON: Bool = false) async throws -> Data {
        let location = try ContentManifest.validURL(url)
        let (data, response) = try await session.data(for: URLRequest(url: location, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 25))
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { throw ProbeError(message: "HTTP request failed: \(url)") }
        guard let finalURL = http.url, (try? ContentManifest.validURL(finalURL.absoluteString)) != nil else { throw ContentValidationError.invalidURL }
        guard data.count <= maximumBytes else { throw ContentValidationError.invalidSize }
        if expectsJSON, !(http.mimeType ?? "").contains("json") { throw ProbeError(message: "Content feed is not deployed: expected JSON but received \(http.mimeType ?? "unknown") at \(url). HTTP 200 alone is insufficient.") }
        return data
    }
    static func main() async {
        let reportURL = URL(fileURLWithPath: CommandLine.arguments[1])
        let cacheURL = URL(fileURLWithPath: CommandLine.arguments[2])
        let config = URLSessionConfiguration.ephemeral
        config.urlCache = nil; config.httpShouldSetCookies = false; config.httpCookieStorage = nil; config.urlCredentialStorage = nil
        config.timeoutIntervalForResource = 60
        let session = URLSession(configuration: config, delegate: HTTPSPolicy(), delegateQueue: nil)
        defer { session.invalidateAndCancel() }
        var report: [String: Any] = ["verifiedAt": ISO8601DateFormatter().string(from: Date()), "manifestURL": manifestURL,
            "scope": "Live HTTPS and production GlfansCore decoding/cache contract. App lifecycle one-hour throttling and UIKit rendering are verified separately."]
        do {
            let manifest = try ContentManifest.decode(await fetch(manifestURL, session: session, maximumBytes: ContentManifest.maximumManifestBytes, expectsJSON: true))
            var files: [String: Data] = [:]
            for key in ContentManifest.requiredFiles {
                let file = manifest.files[key]!
                let data = try await fetch(file.url, session: session, maximumBytes: file.bytes, expectsJSON: true)
                try file.verify(data); files[key] = data
            }
            let snapshot = try ContentSnapshot(manifest: manifest, files: files)
            let cache = ContentSnapshotCache(url: cacheURL)
            try cache.save(snapshot)
            let restored = try cache.load()
            guard restored.manifest.version == manifest.version, restored.files == files else { throw ProbeError(message: "Atomic cache reload differs from downloaded release") }
            report["version"] = manifest.version; report["sourceCommit"] = manifest.sourceCommit
            report["downloadedJSONFiles"] = files.count; report["downloadedJSONBytes"] = files.values.reduce(0) { $0 + $1.count }
            report["counts"] = ["dramas": restored.catalog.dramas.count, "cpProfiles": restored.cpCatalog.profiles.count, "collections": restored.catalog.collections.count, "articles": restored.catalog.collections.reduce(0) { $0 + $1.visibleArticles.count }, "scheduleEvents": restored.schedule.events.count, "memes": restored.catalog.memes.count]
            report["atomicCacheReload"] = true

            // A real second HTTPS manifest request exercises manual same-version checking.
            let rechecked = try ContentManifest.decode(await fetch(manifestURL, session: session, maximumBytes: ContentManifest.maximumManifestBytes, expectsJSON: true))
            guard rechecked.version == manifest.version else { throw ProbeError(message: "Production content changed during verification; run again to verify one stable release") }
            report["sameVersionManualCheck"] = true
            report["sameVersionAdditionalJSONDownloads"] = 0

            // Exercise a genuine URLSession failure callback without disabling the user's network.
            let offlineConfig = URLSessionConfiguration.ephemeral; offlineConfig.protocolClasses = [OfflineProtocol.self]
            let offline = URLSession(configuration: offlineConfig)
            defer { offline.invalidateAndCancel() }
            let cacheBefore = try Data(contentsOf: cacheURL)
            do {
                _ = try await fetch(manifestURL, session: offline, maximumBytes: ContentManifest.maximumManifestBytes)
                throw ProbeError(message: "Offline transport unexpectedly succeeded")
            } catch let error as URLError where error.code == .notConnectedToInternet {
                let fallback = try cache.load()
                guard fallback.manifest.version == manifest.version, try Data(contentsOf: cacheURL) == cacheBefore else { throw ProbeError(message: "Offline fallback changed the last complete cache") }
                report["simulatedOfflineRetainsCompleteCache"] = true
            }

            let sampleKey = manifest.assets.keys.sorted().first { $0.contains("/us/") && $0.contains("ep03") } ?? manifest.assets.keys.sorted().first
            guard let sampleKey, let imageFile = manifest.assets[sampleKey] else { throw ProbeError(message: "No image descriptor to verify") }
            let bytes = try await fetch(imageFile.url, session: session, maximumBytes: imageFile.bytes)
            try imageFile.verify(bytes)
            guard let imageSource = CGImageSourceCreateWithData(bytes as CFData, nil), let image = CGImageSourceCreateImageAtIndex(imageSource, 0, nil), image.width > 0, image.height > 0 else { throw ProbeError(message: "Downloaded image failed ImageIO decode") }
            report["downloadedImage"] = ["asset": sampleKey, "sha256": imageFile.sha256, "bytes": bytes.count, "width": image.width, "height": image.height, "decoder": "macOS ImageIO"]
            report["passed"] = true
        } catch {
            report["passed"] = false; report["error"] = error.localizedDescription
        }
        let data = try! JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes])
        try! data.write(to: reportURL, options: .atomic)
    }
}
`;
try {
  run('swift', ['build', '--package-path', core]);
  const bin = run('swift', ['build', '--package-path', core, '--show-bin-path']);
  const objects = fs.readdirSync(path.join(bin, 'GlfansCore.build')).filter(file => file.endsWith('.swift.o')).map(file => path.join(bin, 'GlfansCore.build', file));
  const swift = path.join(temporary, 'LiveContentProbe.swift');
  const executable = path.join(temporary, 'verify-live-content');
  const reportPath = path.join(temporary, 'report.json');
  fs.writeFileSync(swift, source);
  run('xcrun', ['swiftc', '-parse-as-library', '-I', path.join(bin, 'Modules'), swift, ...objects, '-o', executable]);
  run(executable, [reportPath, path.join(temporary, 'cache', 'content.json')]);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  if (output) { fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); }
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
