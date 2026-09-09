import XCTest
@testable import GlfansCore

final class GlfansCoreTests: XCTestCase {
    var generated: URL { URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("Generated") }
    func testBundledCatalogAndEveryVisibleArticle() throws {
        let catalog = try Catalog.decode(Data(contentsOf: generated.appendingPathComponent("catalog.json")))
        XCTAssertGreaterThan(catalog.dramas.count, 70)
        XCTAssertEqual(catalog.collections.count, 6)
        XCTAssertEqual(Set(catalog.dramas.map(\.id)).count, catalog.dramas.count)
        for collection in catalog.collections {
            _ = try ArticleParser.parse(collection.summaryXml)
            for article in collection.articles {
                XCTAssertNotEqual(article.hidden, true)
                let blocks = try ArticleParser.parse(article.xml)
                XCTAssertFalse(blocks.isEmpty, article.title)
                for block in blocks where block.kind == .image {
                    let reference = try XCTUnwrap(block.source)
                    if reference.hasPrefix("assets/") { XCTAssertTrue(FileManager.default.fileExists(atPath: generated.appendingPathComponent(reference.replacingOccurrences(of: ".webp", with: ".png")).path), reference) }
                }
            }
        }
        for drama in catalog.dramas { XCTAssertTrue(FileManager.default.fileExists(atPath: generated.appendingPathComponent(drama.image.replacingOccurrences(of: ".webp", with: ".png")).path)) }
        XCTAssertEqual(AppSection.navigation.first, .archive)
        XCTAssertFalse(catalog.radio.stations.isEmpty)
        for station in catalog.radio.stations { XCTAssertTrue(station.tracks.allSatisfy { $0.cpId == station.id }) }
    }
    func testCalendarDateOnlyIsNotMidnightAndTimedEventCrossesZones() throws {
        let data = Data(#"{"id":"s:ep:1","seriesId":"s","episode":1,"airsAt":"2026-09-09T16:30:00.000Z","date":"2026-09-09","kind":"episode","sourceUrl":"https://example.com","needsReview":false}"#.utf8)
        let event = try JSONDecoder().decode(BroadcastEvent.self, from: data)
        XCTAssertEqual(event.day(in: TimeZone(identifier: "Asia/Shanghai")!), "2026-09-10")
        XCTAssertEqual(event.day(in: TimeZone(identifier: "Asia/Bangkok")!), "2026-09-09")
        let dateOnly = try JSONDecoder().decode(BroadcastEvent.self, from: Data(#"{"id":"s:premiere","seriesId":"s","date":"2026-09-09","kind":"premiere","sourceUrl":"https://example.com","needsReview":false}"#.utf8))
        XCTAssertNil(dateOnly.timestamp)
        XCTAssertEqual(dateOnly.day(in: TimeZone(identifier: "Asia/Shanghai")!), "2026-09-09")
        XCTAssertEqual(dateOnly.status(now: CalendarRules.timestamp("2026-09-09T05:00:00Z")!), "今日播出")
        XCTAssertEqual(dateOnly.status(now: CalendarRules.timestamp("2026-09-10T05:00:00Z")!), "已播出")
    }
    func testRealScheduleUniqueConfirmedAndWeekBoundaries() throws {
        let schedule = try JSONDecoder().decode(BroadcastSchedule.self, from: Data(contentsOf: generated.appendingPathComponent("schedule.json")))
        XCTAssertEqual(Set(schedule.events.map(\.id)).count, schedule.events.count)
        XCTAssertFalse(schedule.confirmed.isEmpty)
        XCTAssertTrue(schedule.confirmed.allSatisfy { !$0.needsReview })
        let week = CalendarRules.week(containing: CalendarRules.timestamp("2026-08-01T12:00:00Z")!, zone: TimeZone(identifier: "Asia/Shanghai")!)
        XCTAssertEqual(week.count, 7)
        XCTAssertEqual(CalendarRules.day(week[0], zone: TimeZone(identifier: "Asia/Shanghai")!), "2026-07-27")
        XCTAssertEqual(CalendarRules.day(week[6], zone: TimeZone(identifier: "Asia/Shanghai")!), "2026-08-02")
    }
    func testCurrentReviewFlagOverridesHistoricalDate() throws {
        func schedule(review: Bool) throws -> BroadcastSchedule {
            try JSONDecoder().decode(BroadcastSchedule.self, from: Data("""
            {"checkedAt":"2026-09-09","series":[],"events":[{"id":"s:ep:1","seriesId":"s","date":"2026-09-09","kind":"episode","sourceUrl":"https://example.com","needsReview":\(review)}]}
            """.utf8))
        }
        let merged = try BroadcastSchedule.merge(history: schedule(review: false), current: schedule(review: true))
        XCTAssertEqual(merged.events.count, 1)
        XCTAssertTrue(merged.confirmed.isEmpty)
    }
    func testRichTextOrderAndNoExternalEntityExpansion() throws {
        let blocks = try ArticleParser.parse("<h1>Title</h1><p>A <b>bold</b> line.</p><img href=\"assets/photo.webp\"/><p>End</p>", hideLeadHeading: true)
        XCTAssertEqual(blocks.map(\.kind), [.paragraph, .image, .paragraph])
        XCTAssertEqual(blocks[0].text, "A bold line.")
        XCTAssertTrue(blocks[0].runs.contains { $0.bold && $0.text == "bold" })
        XCTAssertThrowsError(try ArticleParser.parse("<p>broken"))
    }
    func testCommentUnicodeValidationAndEmptyState() {
        XCTAssertFalse(CommunityValidation.valid(" \n ", range: 2...400))
        XCTAssertFalse(CommunityValidation.valid(String(repeating: "字", count: 401), range: 2...400))
        XCTAssertTrue(CommunityValidation.valid("评论", range: 2...400))
        XCTAssertEqual(CommunityValidation.commentMode(knownCount: 0), .writing)
        XCTAssertEqual(CommunityValidation.commentMode(knownCount: nil), .loading)
    }
    func testAudioRedirectUpgradesOnlyExpectedHosts() throws {
        let url = try XCTUnwrap(URL(string: "http://m701.music.126.net/audio.mp3?signature=a%2Fb%2Bc"))
        XCTAssertEqual(AudioSourcePolicy.secureURL(url)?.absoluteString, "https://m701.music.126.net/audio.mp3?signature=a%2Fb%2Bc")
        XCTAssertNil(AudioSourcePolicy.secureURL(URL(string: "http://music.126.net.example.com/audio.mp3")!))
        XCTAssertNil(AudioSourcePolicy.secureURL(URL(string: "file:///audio.mp3")!))
        XCTAssertNil(AudioSourcePolicy.secureURL(URL(string: "https://user:secret@music.163.com/audio.mp3")!))
    }
}
