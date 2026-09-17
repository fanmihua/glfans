import XCTest
@testable import GlfansCore

final class GlfansCoreTests: XCTestCase {
    var generated: URL { URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("Generated") }
    func testBundledCatalogAndEveryVisibleArticle() throws {
        let catalog = try Catalog.decode(Data(contentsOf: generated.appendingPathComponent("catalog.json")))
        XCTAssertGreaterThan(catalog.dramas.count, 70)
        XCTAssertEqual(catalog.collections.count, 5)
        XCTAssertFalse(catalog.collections.contains { $0.slug == "my-secret-words" })
        let us = try XCTUnwrap(catalog.collections.first { $0.slug == "us" })
        XCTAssertEqual(us.articles.map(\.slug), (1...12).map { String(format: "unsaid-fragments-ep%02d", $0) })
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
        XCTAssertEqual(AppSection.navigation, [.archive, .cp, .repo, .memes])
        XCTAssertTrue(catalog.quotes.isEmpty)
        XCTAssertTrue(catalog.radio.tracks.isEmpty)
        XCTAssertTrue(catalog.homeCards.isEmpty)
        XCTAssertEqual(catalog.homeLinks.map(\.id), ["archive", "cp", "column", "memes", "about"])
    }
    func testCompleteCpArchiveSnapshotAndAssets() throws {
        let cp = try CpCatalog.decode(Data(contentsOf: generated.appendingPathComponent("cp-catalog.json")))
        XCTAssertEqual(cp.profiles.count, 51)
        XCTAssertEqual(cp.profiles.filter { $0.status == "active" }.count, 14)
        XCTAssertEqual(cp.profiles.filter { $0.status == "ended" }.count, 4)
        XCTAssertEqual(cp.profiles.filter { $0.status == "unverified" }.count, 33)
        XCTAssertEqual(Set(cp.profiles.map(\.id)).count, cp.profiles.count)
        XCTAssertEqual(cp.profiles.compactMap { $0.detail.child }.count, 5)
        XCTAssertEqual(cp.profiles.compactMap { $0.detail.notice }.count, 4)
        XCTAssertEqual(cp.profile("namtanfilm")?.detail.child?.name, "LUNAR")
        XCTAssertTrue(cp.profiles.first(where: { $0.id == "engfacharlotte" })?.matches("Charlotte") == true)
        for profile in cp.profiles {
            XCTAssertEqual(profile.detail.cp.members.count, 2, profile.id)
            XCTAssertNil(profile.detail.community)
            XCTAssertTrue(profile.detail.cp.shops.isEmpty)
            for source in cpImageSources(profile.detail) where source.hasPrefix("assets/") {
                let local = source.replacingOccurrences(of: ".webp", with: ".png")
                XCTAssertTrue(FileManager.default.fileExists(atPath: generated.appendingPathComponent(local).path), "\(profile.id): \(source)")
            }
        }
    }
    private func cpImageSources(_ detail: CpDetail) -> [String] {
        var values = [detail.cp.image].compactMap { $0 }
        values += detail.works.map(\.image)
        values += (detail.cp.upcoming ?? []).map(\.image)
        values += detail.media.map(\.image)
        values += detail.cp.events.compactMap(\.image)
        if let child = detail.child { values += [child.image, child.video.image] }
        if let notice = detail.notice { values += notice.images.map(\.image) }
        return values
    }
    func testNativeDocumentKeepsAllPublishedTextAndMedia() throws {
        let catalog = try Catalog.decode(Data(contentsOf:generated.appendingPathComponent("catalog.json")))
        var images=0,paragraphs=0,sourceImages=0,sourceParagraphs=0
        for collection in catalog.collections {
            for article in collection.visibleArticles {
                let range = NSRange(article.xml.startIndex..<article.xml.endIndex, in: article.xml)
                sourceImages += try NSRegularExpression(pattern: "<img\\b").numberOfMatches(in: article.xml, range: range)
                sourceParagraphs += try NSRegularExpression(pattern: "<p\\b").numberOfMatches(in: article.xml, range: range)
                let document=try XCTUnwrap(ArticleDocumentParser.parse(article.xml),article.slug)
                images += document.descendants("img").count
                paragraphs += document.descendants("p").count
                let legacy=try ArticleParser.parse(article.xml)
                XCTAssertEqual(document.descendants("img").compactMap{$0.attributes["href"]},legacy.filter{$0.kind == .image}.compactMap(\.source))
                XCTAssertNotNil(article.displayTitle)
            }
        }
        XCTAssertGreaterThan(images, 0); XCTAssertGreaterThan(paragraphs, 0)
        XCTAssertEqual(images,sourceImages);XCTAssertEqual(paragraphs,sourceParagraphs)
        let rich=try XCTUnwrap(ArticleDocumentParser.parse("<quote>A <b>source</b></quote><p>Next <a href=\"https://example.com\">link</a></p>"))
        XCTAssertEqual(rich.children.map(\.text),["A source","Next link"])
        XCTAssertEqual(rich.descendants("a").first?.attributes["href"],"https://example.com")
        XCTAssertNil(ArticleDocumentParser.parse("<p>broken"))
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
    func testCalendarIndexPreservesZonesReviewFlagsAndFollowFiltering() throws {
        let schedule = try JSONDecoder().decode(BroadcastSchedule.self, from: Data(contentsOf: generated.appendingPathComponent("schedule.json")))
        for name in ["Asia/Shanghai", "Asia/Bangkok"] {
            let zone = try XCTUnwrap(TimeZone(identifier: name))
            let index = CalendarEventIndex(events: schedule.events, zone: zone)
            let expected = Dictionary(grouping: schedule.confirmed, by: { $0.day(in: zone) })
            for (day, events) in expected {
                XCTAssertEqual(index.events(on: day).map(\.id), events.map(\.id))
                let followed: Set<String> = [try XCTUnwrap(events.first).seriesId]
                XCTAssertEqual(index.events(on: day, following: followed).map(\.id), events.filter { followed.contains($0.seriesId) }.map(\.id))
            }
            XCTAssertTrue(index.availableMonths(following: []).isEmpty)
            XCTAssertEqual(index.availableMonths().values.flatMap { $0 }.count, schedule.confirmed.count)
        }
        let timed = try JSONDecoder().decode(BroadcastEvent.self, from: Data(#"{"id":"boundary","seriesId":"s","date":"2026-09-30","airsAt":"2026-09-30T16:30:00Z","kind":"episode","sourceUrl":"https://example.com","needsReview":false}"#.utf8))
        let shanghai = CalendarEventIndex(events: [timed], zone: TimeZone(identifier: "Asia/Shanghai")!)
        let bangkok = CalendarEventIndex(events: [timed], zone: TimeZone(identifier: "Asia/Bangkok")!)
        XCTAssertEqual(shanghai.events(on: "2026-10-01").map(\.id), ["boundary"])
        XCTAssertEqual(Set(shanghai.availableMonths().keys), ["2026-10"])
        XCTAssertEqual(bangkok.events(on: "2026-09-30").map(\.id), ["boundary"])
        XCTAssertEqual(Set(bangkok.availableMonths().keys), ["2026-09"])
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
