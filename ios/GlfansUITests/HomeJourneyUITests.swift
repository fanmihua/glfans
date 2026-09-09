import XCTest

final class HomeJourneyUITests: XCTestCase {
    let app = XCUIApplication()
    override func setUpWithError() throws { continueAfterFailure = false }
    func launch(_ extra:[String] = []) {
        app.launchArguments = ["--section","home","--locale","zh"] + extra
        app.launch()
    }
    func testCompleteOpeningAndReplay() {
        launch()
        let enter = app.buttons["home-enter-label"]
        XCTAssertTrue(enter.waitForExistence(timeout:15))
        for id in ["namtanfilm","emibonnie","janjingjing","freenbecky","lingorm"] {
            XCTAssertTrue(app.buttons["home-card-\(id)"].isHittable, "\(id) must be a real entry")
        }
        enter.tap()
        XCTAssertTrue(app.staticTexts["两眼一闭"].waitForExistence(timeout:2))
        let replay = app.buttons["home-replay"]
        XCTAssertTrue(replay.waitForExistence(timeout:8))
        for id in ["archive","tide-words","column","memes","radio","about"] {
            XCTAssertTrue(app.buttons["home-link-\(id)"].isHittable)
        }
        replay.tap()
        XCTAssertTrue(enter.waitForExistence(timeout:3))
        app.buttons["home-card-lingorm"].tap()
        XCTAssertTrue(replay.waitForExistence(timeout:8))
        let image = XCTAttachment(screenshot:app.screenshot());image.name="opening-welcome-13ProMax";image.lifetime = .keepAlways;add(image)
        app.buttons["home-link-about"].tap()
        XCTAssertTrue(app.staticTexts["关于这个坑"].firstMatch.waitForExistence(timeout:4))
    }
    func testLanguagePreservesWelcomeAndArchiveRouteWorks() {
        launch(["--home-scene","welcome"])
        XCTAssertTrue(app.buttons["home-replay"].waitForExistence(timeout:10))
        app.buttons["home-language-en"].tap()
        XCTAssertTrue(app.buttons["home-replay"].exists)
        app.buttons["home-language-th"].tap()
        XCTAssertTrue(app.buttons["home-link-archive"].isHittable)
        app.buttons["home-language-zh"].tap()
        app.buttons["home-link-archive"].tap()
        XCTAssertTrue(app.buttons["查看播出日历"].waitForExistence(timeout:6))
    }
    func testReducedMotionKeepsTheJourneyAndReplay() {
        launch(["--home-reduced-motion"])
        XCTAssertTrue(app.buttons["home-enter-label"].waitForExistence(timeout:10))
        app.buttons["home-enter-label"].tap()
        XCTAssertTrue(app.buttons["home-replay"].waitForExistence(timeout:3))
        app.buttons["home-replay"].tap()
        XCTAssertTrue(app.buttons["home-enter-label"].waitForExistence(timeout:3))
    }
    func testBackgroundDoesNotConsumeOpening() {
        launch()
        XCTAssertTrue(app.buttons["home-enter-label"].waitForExistence(timeout:10))
        app.buttons["home-enter-label"].tap()
        XCUIDevice.shared.press(.home)
        sleep(4)
        app.activate()
        XCTAssertFalse(app.buttons["home-replay"].exists)
        XCTAssertTrue(app.buttons["home-replay"].waitForExistence(timeout:8))
    }
}
