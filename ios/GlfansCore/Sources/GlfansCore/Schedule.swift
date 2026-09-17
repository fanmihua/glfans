import Foundation

public struct BroadcastSchedule: Codable, Sendable {
    public let checkedAt: String
    public let historyCheckedAt: String?
    public let series: [ScheduledSeries]
    public let events: [BroadcastEvent]
    public var confirmed: [BroadcastEvent] { events.filter { !$0.needsReview } }
    public static func merge(history: BroadcastSchedule, current: BroadcastSchedule) -> BroadcastSchedule {
        var seriesByID = history.series.reduce(into: [String: ScheduledSeries]()) { $0[$1.id] = $1 }
        current.series.forEach { seriesByID[$0.id] = $0 }
        var eventsByID = history.events.reduce(into: [String: BroadcastEvent]()) { $0[$1.id] = $1 }
        current.events.forEach { eventsByID[$0.id] = $0 }
        let events = eventsByID.values.filter { $0.kind != "premiere" || eventsByID[$0.seriesId + ":ep:1"] == nil }.sorted { $0.date == $1.date ? $0.id < $1.id : $0.date < $1.date }
        return BroadcastSchedule(checkedAt: current.checkedAt, historyCheckedAt: history.checkedAt, series: seriesByID.values.sorted { $0.name < $1.name }, events: events)
    }
}
public struct ScheduledSeries: Codable, Identifiable, Sendable {
    public let id: String
    public let name: String
    public let network: String?
    public let platforms: [String]
    public let sourceUrl: String
    public let premiereDate: String?
}
public struct BroadcastEvent: Codable, Identifiable, Sendable {
    public let id: String
    public let seriesId: String
    public let episode: Int?
    public let airsAt: String?
    public let date: String
    public let kind: String
    public let sourceUrl: String
    public let needsReview: Bool
    public let network: String?

    public var timestamp: Date? { airsAt.flatMap(CalendarRules.timestamp) }
    public func day(in zone: TimeZone) -> String {
        timestamp.map { CalendarRules.day($0, zone: zone) } ?? date
    }
    public func status(now: Date = Date()) -> String {
        if needsReview { return "待核实" }
        if let timestamp { return timestamp <= now ? "已播出" : "待播" }
        let today = CalendarRules.day(now, zone: TimeZone(identifier: "Asia/Bangkok")!)
        return date == today ? "今日播出" : date < today ? "已播出" : "待播"
    }
}
public enum CalendarRules {
    public static func timestamp(_ value: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: value) ?? ISO8601DateFormatter().date(from: value)
    }
    public static func day(_ date: Date, zone: TimeZone) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = zone; formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
    public static func week(containing date: Date, zone: TimeZone) -> [Date] {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = zone; calendar.firstWeekday = 2
        let weekday = calendar.component(.weekday, from: date)
        let start = calendar.date(byAdding: .day, value: -((weekday + 5) % 7), to: calendar.startOfDay(for: date))!
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: start) }
    }
}

/// Parsed once per schedule/time-zone change, shared by the week and month views.
/// Pointer movement and button taps only look up the visible days.
public struct CalendarEventIndex: Sendable {
    private let days: [String: [BroadcastEvent]]
    private let months: [String: [BroadcastEvent]]
    public let confirmedSeriesIDs: Set<String>

    public init(events: [BroadcastEvent], zone: TimeZone) {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let whole = ISO8601DateFormatter()
        let dayFormatter = DateFormatter()
        dayFormatter.locale = Locale(identifier: "en_US_POSIX")
        dayFormatter.calendar = Calendar(identifier: .gregorian)
        dayFormatter.timeZone = zone
        dayFormatter.dateFormat = "yyyy-MM-dd"
        var days: [String: [BroadcastEvent]] = [:]
        var months: [String: [BroadcastEvent]] = [:]
        var ids: Set<String> = []
        for event in events where !event.needsReview {
            let timestamp = event.airsAt.flatMap { fractional.date(from: $0) ?? whole.date(from: $0) }
            let day = timestamp.map { dayFormatter.string(from: $0) } ?? event.date
            days[day, default: []].append(event)
            months[String(day.prefix(7)), default: []].append(event)
            ids.insert(event.seriesId)
        }
        self.days = days; self.months = months; confirmedSeriesIDs = ids
    }
    public func events(on day: String, following: Set<String>? = nil) -> [BroadcastEvent] {
        let entries = days[day] ?? []
        return following.map { ids in entries.filter { ids.contains($0.seriesId) } } ?? entries
    }
    public func availableMonths(following: Set<String>? = nil) -> [String: [BroadcastEvent]] {
        guard let following else { return months }
        return months.mapValues { $0.filter { following.contains($0.seriesId) } }.filter { !$0.value.isEmpty }
    }
}
