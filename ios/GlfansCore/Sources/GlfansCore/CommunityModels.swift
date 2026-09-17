import Foundation

public struct CommunityStats: Codable, Sendable {
    public let target_type: String
    public let target_id: String
    public var comment_count: Int
    public var reaction_count: Int
    public var unique_visitor_count: Int
    public var view_count: Int
    public var key: String { "\(target_type):\(target_id)" }
    public init(type:String,id:String,comments:Int,reactions:Int,visitors:Int,views:Int) {
        target_type=type;target_id=id;comment_count=comments;reaction_count=reactions;unique_visitor_count=visitors;view_count=views
    }
}
public struct CommunityComment: Codable, Identifiable, Sendable {
    public let id: String
    public let target_type: String
    public let target_id: String
    public let nickname: String
    public let body: String
    public let created_at: String
    public var author_key: String?
}
public struct CommunityBlock: Codable, Identifiable, Sendable {
    public let author_key: String
    public let created_at: String
    public var id: String { author_key }
}
public struct ReactionResult: Decodable, Sendable {
    public let liked: Bool
    public let reaction_count: Int
}
public struct ReactionTarget: Decodable, Sendable {
    public let target_type: String
    public let target_id: String
    public var key: String { "\(target_type):\(target_id)" }
}
public enum CommentMode: Equatable, Sendable { case loading, reading, writing }
public enum CommunityValidation {
    // PostgreSQL char_length 按 Unicode scalar 计数，避免 Swift 字素簇与数据库校验不一致。
    public static func valid(_ text: String, range: ClosedRange<Int>) -> Bool {
        range.contains(text.trimmingCharacters(in: .whitespacesAndNewlines).unicodeScalars.count)
    }
    public static func commentMode(knownCount: Int?) -> CommentMode {
        knownCount == 0 ? .writing : .loading
    }
    public static func message(_ error: String) -> String {
        if error.contains("rate_limit") { return "留言有点密集，先歇十分钟再来。" }
        if error.contains("comment_body") { return "评论需要 2—400 个字。" }
        if error.contains("quote_text") { return "原话需要 2—120 个字。" }
        if error.contains("nickname") { return "昵称请控制在 24 个字以内。" }
        if error.contains("blocked") { return "当前身份暂时无法发布，请联系管理员。" }
        if error.contains("moderation") { return "这段内容需要调整后再发布。" }
        return "互动服务暂时没有回应，请稍后重试。"
    }
}
