import XCTest

final class GlfansUITests: XCTestCase {
    let app = XCUIApplication()
    override func setUpWithError() throws { continueAfterFailure = false }
    func launch(_ section: String = "archive", locale: String = "zh") {
        app.launchArguments = ["--section", section, "--locale", locale]
        app.launch()
        XCTAssertTrue(app.tabBars.firstMatch.waitForExistence(timeout: 15))
    }
    func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot()); attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
    func testFiveSectionsAndFullArticleNavigation() {
        launch()
        XCTAssertTrue(app.buttons["查看播出日历"].exists)
        capture("01-archive")
        app.tabBars.buttons["文学"].tap()
        XCTAssertTrue(app.staticTexts["VOICES FROM THE PIT"].waitForExistence(timeout: 10))
        capture("02-literature")
        app.tabBars.buttons["REPO"].tap()
        XCTAssertTrue(app.staticTexts["ROMANCE · EVIDENCE · ARCHIVE"].waitForExistence(timeout: 5))
        capture("03-repo")
        let collection = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "collection-")).firstMatch
        XCTAssertTrue(collection.exists)
        collection.tap()
        capture("04-collection")
        let article = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "article-")).firstMatch
        for _ in 0..<12 { if article.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(article.isHittable)
        article.tap()
        capture("04b-article")
        app.tabBars.buttons["表情"].tap()
        XCTAssertTrue(app.buttons["拍一张"].waitForExistence(timeout: 5))
        app.buttons["拍一张"].tap()
        XCTAssertTrue(app.buttons["再拍一张"].waitForExistence(timeout: 8))
        capture("05-meme")
        app.tabBars.buttons["电台"].tap()
        XCTAssertTrue(app.staticTexts["PIT FM"].firstMatch.waitForExistence(timeout: 5))
        capture("06-radio")
    }
    func testCalendarFollowingAndDismissal() {
        launch()
        app.buttons["查看播出日历"].tap()
        XCTAssertTrue(app.navigationBars["播出日历"].waitForExistence(timeout: 5))
        app.buttons["选剧"].tap()
        XCTAssertTrue(app.navigationBars["选剧"].waitForExistence(timeout: 5))
        app.navigationBars.buttons["完成"].tap()
        XCTAssertTrue(app.buttons["关注"].exists)
        capture("07-calendar-following")
        app.buttons["全部"].tap()
        app.buttons["下个月"].tap()
        app.buttons["今天"].tap()
        capture("08-calendar-today")
        app.navigationBars.buttons["完成"].tap()
        XCTAssertTrue(app.buttons["查看播出日历"].exists)
    }
    func testEnglishAndThaiRootLayout() {
        launch(locale: "en")
        XCTAssertTrue(app.buttons["Broadcast calendar"].exists)
        capture("09-english")
        app.terminate()
        launch(locale: "th")
        XCTAssertTrue(app.buttons["ดูปฏิทินออกอากาศ"].exists)
        capture("10-thai")
    }
}
