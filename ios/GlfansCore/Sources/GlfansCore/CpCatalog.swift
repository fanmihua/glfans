import Foundation

public struct CpCatalog: Decodable, Sendable {
    public let schemaVersion: Int
    public let verifiedAt: String
    public let statusCheckedAt: String
    public let copies: CpCopies
    public let profiles: [CpProfile]

    public static func decode(_ data: Data) throws -> CpCatalog {
        let value = try JSONDecoder().decode(CpCatalog.self, from: data)
        guard value.schemaVersion == 1 else { throw CatalogError.unsupportedVersion }
        return value
    }
    public func profile(_ id: String?) -> CpProfile? {
        profiles.first(where: { $0.id == id }) ?? profiles.first
    }
    public func copy(_ section: CpCopySection, _ key: String, locale: String) -> String? {
        copies.values(section, locale: locale)[key]?.stringValue
    }
}

public enum CpCopySection: Sendable { case ui, journal, status, children, zodiac }

public struct CpCopies: Decodable, Sendable {
    public let ui: CpLocalizedDictionary
    public let journal: CpLocalizedDictionary
    public let status: CpLocalizedDictionary
    public let children: CpLocalizedDictionary
    public let zodiac: CpLocalizedDictionary

    public func values(_ section: CpCopySection, locale: String) -> [String: CpJSONValue] {
        switch section {
        case .ui: ui.values(locale)
        case .journal: journal.values(locale)
        case .status: status.values(locale)
        case .children: children.values(locale)
        case .zodiac: zodiac.values(locale)
        }
    }
}

public struct CpLocalizedDictionary: Decodable, Sendable {
    public let zh: [String: CpJSONValue]
    public let en: [String: CpJSONValue]
    public let th: [String: CpJSONValue]
    public func values(_ locale: String) -> [String: CpJSONValue] { locale == "en" ? en : locale == "th" ? th : zh }
}

public enum CpJSONValue: Decodable, Sendable {
    case string(String), object([String: CpJSONValue]), array([CpJSONValue]), bool(Bool), number(Double), null
    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() { self = .null }
        else if let value = try? container.decode(String.self) { self = .string(value) }
        else if let value = try? container.decode(Bool.self) { self = .bool(value) }
        else if let value = try? container.decode(Double.self) { self = .number(value) }
        else if let value = try? container.decode([String: CpJSONValue].self) { self = .object(value) }
        else { self = .array(try container.decode([CpJSONValue].self)) }
    }
    public var stringValue: String? { if case let .string(value) = self { value } else { nil } }
}

public struct CpProfile: Decodable, Identifiable, Sendable {
    public let id: String
    public let label: String
    public let names: [String]
    public let aliases: [String]
    public let status: String
    public let searchTerms: [String]
    public let detail: CpDetail
    public func matches(_ query: String) -> Bool {
        let needle = query.trimmingCharacters(in: .whitespacesAndNewlines).folding(options: [.caseInsensitive, .diacriticInsensitive], locale: .current)
        return needle.isEmpty || searchTerms.contains { $0.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: .current).contains(needle) }
    }
}

public struct CpDetail: Decodable, Sendable {
    public let cp: CpIdentity
    public let media: [CpMedia]
    public let timeline: [CpTimelineEvent]
    public let works: [Drama]
    public let child: CpChild?
    public let notice: CpNotice?
    public let milestones: [CpTimelineEvent]
    public let collaboration: CpCollaboration
    public let community: CpCommunity?
}

public struct CpIdentity: Decodable, Sendable {
    public let id: String
    public let names: [String]
    public let aliases: [String]?
    public let image: String?
    public let members: [CpMember]
    public let intro: LocalizedText
    public let works: [CpWorkReference]
    public let upcoming: [CpUpcomingWork]?
    public let events: [CpPublicEntry]
    public let shops: [CpPublicEntry]
}

public struct LocalizedText: Decodable, Sendable {
    public let zh: String
    public let en: String
    public let th: String
    public func value(_ locale: String) -> String { locale == "en" ? en : locale == "th" ? th : zh }
}

public struct CpMember: Decodable, Sendable {
    public let name: String
    public let nickname: String?
    public let instagram: String?
    public let x: String?
    public let source: String
    public let weibo: CpSocial?
    public let profile: CpMemberProfile
}

public struct CpSocial: Decodable, Sendable { public let handle: String?; public let url: String? }
public struct CpReference: Decodable, Sendable { public let url: String; public let kind: String }
public struct CpMemberProfile: Decodable, Sendable {
    public let fullName: String
    public let birthday: String?
    public let birthdayMonthDay: String?
    public let heightCm: Int?
    public let sign: String?
    public let checkedAt: String
    public let references: [CpReference]
}

public struct CpWorkReference: Decodable, Identifiable, Sendable {
    public let id: String
    public let title: String
    public let year: String
    public let source: String
    public let ensemble: Bool
}

public struct CpUpcomingWork: Decodable, Identifiable, Sendable {
    public let id: String
    public let title: String
    public let source: String
    public let image: String
    public let publisher: String
    public let focus: String?
    public let status: String?
}

public struct CpPublicEntry: Decodable, Identifiable, Sendable {
    public var id: String { url ?? source }
    public let title: String
    public let kind: String
    public let url: String?
    public let source: String
    public let publisher: String?
    public let owner: String?
    public let date: String?
    public let image: String?
}

public struct CpMedia: Decodable, Identifiable, Sendable {
    public let id: String
    public let title: String
    public let performers: [String]
    public let scope: String
    public let workId: String?
    public let publisher: String
    public let category: String
    public let kind: String
    public let url: String
    public let source: String
    public let image: String
    public let date: String?
    public let memberIndex: Int?
    public let square: Bool?
}

public struct CpTimelineEvent: Decodable, Identifiable, Sendable {
    public let id: String
    public let date: String?
    public let lane: String
    public let kind: String
    public let title: String?
    public let source: String
    public let publisher: String?
    public let description: LocalizedText?
    public let summary: LocalizedText?
    public let workId: String?
    public let image: String?
    public let images: [CpNoticeImage]?

    enum CodingKeys: String, CodingKey { case id, date, lane, kind, title, source, publisher, description, summary, workId, image, images }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        date = try c.decodeIfPresent(String.self, forKey: .date)
        if let value = try? c.decode(String.self, forKey: .lane) { lane = value }
        else { lane = String(try c.decode(Int.self, forKey: .lane)) }
        kind = try c.decode(String.self, forKey: .kind)
        title = try c.decodeIfPresent(String.self, forKey: .title)
        source = try c.decode(String.self, forKey: .source)
        publisher = try c.decodeIfPresent(String.self, forKey: .publisher)
        description = try c.decodeIfPresent(LocalizedText.self, forKey: .description)
        summary = try c.decodeIfPresent(LocalizedText.self, forKey: .summary)
        workId = try c.decodeIfPresent(String.self, forKey: .workId)
        image = try c.decodeIfPresent(String.self, forKey: .image)
        images = try c.decodeIfPresent([CpNoticeImage].self, forKey: .images)
    }
}

public struct CpChild: Decodable, Sendable {
    public let name: String
    public let introduced: String
    public let checkedAt: String
    public let source: String
    public let publisher: String
    public let image: String
    public let video: CpChildVideo
    public let story: LocalizedText
}
public struct CpChildVideo: Decodable, Sendable { public let url: String; public let image: String; public let publisher: String }
public struct CpNoticeImage: Decodable, Sendable { public let language: String; public let image: String; public let source: String }
public struct CpNotice: Decodable, Sendable {
    public let id: String
    public let date: String
    public let status: String
    public let publisher: String
    public let source: String
    public let checkedAt: String
    public let summary: LocalizedText
    public let images: [CpNoticeImage]
}
public struct CpCollaboration: Decodable, Sendable { public let status: String; public let evidence: CpEvidence? }
public struct CpEvidence: Decodable, Sendable {
    public let date: String
    public let source: String
    public let title: String?
    public let publisher: String
    public let checkedAt: String
}
public struct CpCommunity: Decodable, Sendable { public let name: String; public let source: String; public let checkedAt: String; public let url: String }
