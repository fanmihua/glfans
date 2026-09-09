import Foundation

public enum AudioSourcePolicy {
    /// 仅对现有网易云公开音源域名升级 HTTPS，保留签名路径与查询参数。
    public static func secureURL(_ url: URL) -> URL? {
        guard let host = url.host?.lowercased(), host == "music.163.com" || host == "music.126.net" || host.hasSuffix(".music.126.net"),
              ["http", "https"].contains(url.scheme?.lowercased() ?? ""), url.user == nil, url.password == nil else { return nil }
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        components?.scheme = "https"
        return components?.url
    }
}
