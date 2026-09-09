import Foundation
import GlfansCore

final class AudioSourceResolver: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        guard let url = request.url, let secure = AudioSourcePolicy.secureURL(url) else { completionHandler(nil); return }
        var next = request; next.url = secure; completionHandler(next)
    }
    static func resolve(_ source: String) async throws -> URL {
        guard let url = URL(string: source).flatMap(AudioSourcePolicy.secureURL) else { throw URLError(.unsupportedURL) }
        let session = URLSession(configuration: .ephemeral, delegate: AudioSourceResolver(), delegateQueue: nil)
        defer { session.finishTasksAndInvalidate() }
        var request = URLRequest(url: url); request.httpMethod = "HEAD"; request.timeoutInterval = 20
        let (_, response) = try await session.data(for: request)
        guard let response = response as? HTTPURLResponse, (200..<300).contains(response.statusCode), let final = response.url,
              final.scheme == "https", AudioSourcePolicy.secureURL(final) != nil else { throw URLError(.badServerResponse) }
        return final
    }
}
