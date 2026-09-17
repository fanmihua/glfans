import Foundation

public struct Catalog: Decodable, Sendable {
    public let schemaVersion: Int
    public let years: [String]
    public let archiveRepresentativeIds: [String: String]
    public let dramas: [Drama]
    public let collections: [RepoCollection]
    public let quotes: [Quote]
    public let memes: [Meme]
    public let radio: RadioCatalog
    public let homeCards: [HomeCard]
    public let homeLinks: [HomeLink]

    public static func decode(_ data: Data) throws -> Catalog {
        let catalog = try JSONDecoder().decode(Catalog.self, from: data)
        guard catalog.schemaVersion == 1 else { throw CatalogError.unsupportedVersion }
        return catalog
    }
    public func dramas(in year: String) -> [Drama] { dramas.filter { $0.year == year } }
    public func article(collection: String, slug: String) -> RepoArticle? {
        collections.first { $0.slug == collection }?.visibleArticles.first { $0.slug == slug }
    }
}
public enum CatalogError: Error { case unsupportedVersion }

public struct Drama: Decodable, Identifiable, Hashable, Sendable {
    public let id: String
    public let year: String
    public let title: String
    public let titleEn: String
    public let startDate: String
    public let endDate: String?
    public let weekday: String?
    public let episodes: Int?
    public let status: String
    public let company: String
    public let platforms: [String]
    public let summary: String
    public let image: String
    public let width: Int?
    public let height: Int?
    public let focus: String?
    public let cast: [String]
    public let sourceUrl: String
}
public struct RepoCollection: Decodable, Identifiable, Hashable, Sendable {
    public var id: String { slug }
    public let slug: String
    public let title: String
    public let issue: String
    public let cover: String
    public let summaryXml: String
    public let articles: [RepoArticle]
    public var visibleArticles: [RepoArticle] { articles.filter { $0.hidden != true } }
}
public struct RepoArticle: Decodable, Identifiable, Hashable, Sendable {
    public let displayTitle: String?
    public var id: String { slug }
    public let slug: String
    public let label: String
    public let title: String
    public let cover: String?
    public let xml: String
    public let hidden: Bool?
}
public struct Quote: Codable, Identifiable, Hashable, Sendable {
    public let id: String
    public let text: String
    public let speaker: String
    public var cover_path: String?
    public var sort_order: Int?
    public var is_pinned: Bool?
    public var created_at: String?
    public var author_key: String?
    public init(id: String, text: String, speaker: String) {
        self.id = id; self.text = text; self.speaker = speaker
    }
    private enum CodingKeys:String,CodingKey {case id,text,speaker,cover_path,sort_order,is_pinned,created_at,author_key}
    public init(from decoder:Decoder) throws {
        let c=try decoder.container(keyedBy:CodingKeys.self)
        id=try c.decode(String.self,forKey:.id);text=try c.decode(String.self,forKey:.text);speaker=try c.decode(String.self,forKey:.speaker)
        cover_path=try c.decodeIfPresent(String.self,forKey:.cover_path);sort_order=try c.decodeIfPresent(Int.self,forKey:.sort_order)
        created_at=try c.decodeIfPresent(String.self,forKey:.created_at);author_key=try c.decodeIfPresent(String.self,forKey:.author_key)
        if let value=try? c.decode(Bool.self,forKey:.is_pinned) {is_pinned=value}
        else {is_pinned=try c.decodeIfPresent(Int.self,forKey:.is_pinned).map {$0 != 0}}
    }
}
public struct Meme: Codable, Identifiable, Hashable, Sendable {
    public let id: String
    public let title: String
    public let note: String
    public let src: String
    public let alt: String
    public let downloadName: String
}
public struct HomeLink: Decodable, Identifiable, Sendable {
    public let id: String
    public let href: String
    public let label: String
}
public struct HomeCard: Decodable, Identifiable, Sendable {
    public let id: String
    public let name: String
    public let image: String
    public let width: Double
    public let height: Double
}
public struct RadioCatalog: Decodable, Sendable {
    public let playlistId: String
    public let name: String
    public let tracks: [Track]
    public var playableTracks: [Track] { tracks.filter(\.playable) }
    public var stations: [Station] {
        var result = [Station]()
        for track in playableTracks where track.cpArtwork.hasPrefix("assets/home/") {
            if let index = result.firstIndex(where: { $0.id == track.cpId }) {
                result[index].tracks.append(track)
            } else { result.append(Station(id: track.cpId, name: track.cpName, artwork: track.cpArtwork, tracks: [track])) }
        }
        return result
    }
}
public struct Track: Decodable, Identifiable, Hashable, Sendable {
    public let id: String
    public let name: String
    public let artists: [String]
    public let album: String
    public let cover: String
    public let duration: Int
    public let playable: Bool
    public let outerUrl: String
    public let officialUrl: String
    public let cpId: String
    public let cpName: String
    public let cpArtwork: String
}
public struct Station: Identifiable, Sendable {
    public let id: String
    public let name: String
    public let artwork: String
    public var tracks: [Track]
}

public enum AppSection: String, CaseIterable, Identifiable, Sendable {
    case home, archive, cp, literature, repo, memes, radio, about
    public var id: String { rawValue }
    public var title: String {
        switch self {
        case .home: "欢迎入坑"
        case .archive: "考古档案"
        case .cp: "百家饭"
        case .literature: "坑底文学"
        case .repo: "Repo 文专栏"
        case .memes: "来捡表情包"
        case .radio: "坑底电台"
        case .about: "关于这个坑"
        }
    }
    public var shortTitle: String {
        switch self {
        case .archive: "档案"
        case .cp: "百家饭"
        case .literature: "文学"
        case .repo: "REPO"
        case .memes: "表情"
        case .radio: "电台"
        default: title
        }
    }
    public static let navigation: [AppSection] = [.archive, .cp, .repo, .memes]
    public var isPubliclyAvailable: Bool { Self.navigation.contains(self) || self == .about }
}
