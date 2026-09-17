import XCTest

final class GlfansUITests:XCTestCase {
    let app=XCUIApplication()
    override func setUpWithError() throws {continueAfterFailure=false}
    func launch(_ section:String="archive",locale:String="zh",extra:[String]=[]) {
        app.launchArguments=["--section",section,"--locale",locale]+extra
        app.launch()
        XCTAssertTrue(app.buttons["tab-archive"].waitForExistence(timeout:15))
    }
    func capture(_ name:String) {let image=XCTAttachment(screenshot:app.screenshot());image.name=name;image.lifetime = .keepAlways;add(image)}
    func testClosedSectionsFallBackToArchive() {
        for section in ["home", "literature", "radio"] {
            launch(section)
            XCTAssertTrue(app.buttons["open-calendar"].waitForExistence(timeout: 5))
            XCTAssertFalse(app.buttons["tab-literature"].exists)
            XCTAssertFalse(app.buttons["tab-radio"].exists)
            XCTAssertFalse(app.buttons["quote-compose"].exists)
        }
    }
    func testContentRefreshAndPrivacy() {
        launch("about")
        let refresh = app.buttons["refresh-content"]
        for _ in 0..<6 { if refresh.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(refresh.isHittable)
        refresh.tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "最近检查：")).firstMatch.waitForExistence(timeout: 30), "线上内容检查必须成功")
        let privacy = app.buttons["about-privacy"]
        for _ in 0..<5 { if privacy.isHittable { break }; app.swipeUp() }
        privacy.tap(); app.swipeUp()
        XCTAssertFalse(app.buttons["delete-community-account"].exists)
        XCTAssertFalse(app.descendants(matching: .any)["community-guidelines"].exists)
        capture("content-refresh-and-privacy")
    }
    func testAllSectionsAndArticleNavigation() {
        launch()
        XCTAssertTrue(app.buttons["open-calendar"].exists);capture("archive")
        app.buttons["tab-cp"].tap()
        XCTAssertTrue(app.buttons["cp-switcher"].waitForExistence(timeout:5));capture("cp")
        app.buttons["tab-repo"].tap()
        let collection=app.buttons["collection-rival-lover"]
        XCTAssertTrue(collection.waitForExistence(timeout:5));capture("repo");collection.tap()
        XCTAssertTrue(app.buttons["collection-back"].waitForExistence(timeout:5));capture("collection")
        let article=app.buttons["article-wine-ep06-07"]
        for _ in 0..<8 {if article.isHittable {break};app.swipeUp()}
        XCTAssertTrue(article.isHittable);article.tap()
        XCTAssertTrue(app.buttons["article-back"].waitForExistence(timeout:5));capture("article")
        app.swipeUp();capture("article-reading");app.buttons["article-back"].tap()
        XCTAssertTrue(app.buttons["collection-back"].exists)
        app.buttons["tab-memes"].tap();XCTAssertTrue(app.buttons["meme-shutter"].waitForExistence(timeout:5));capture("memes")
        app.buttons["关于 glfans"].tap();XCTAssertTrue(app.buttons["about-rights"].waitForExistence(timeout:5));capture("about")
        for _ in 0..<4 {if app.buttons["about-rights"].isHittable {break};app.swipeUp()}
        app.buttons["about-rights"].tap();app.swipeUp();capture("rights")
    }
    func testCalendarTouchTargetsIncludeTransparentCorners() {
        continueAfterFailure = true
        launch()
        app.buttons["open-calendar"].tap()
        let close = app.buttons["关闭播出日历"]
        XCTAssertTrue(close.waitForExistence(timeout: 5))
        func corner(_ button: XCUIElement) {
            let center = button.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
            center.withOffset(CGVector(dx: 16, dy: 16)).tap()
        }
        let month = app.buttons["选择月份"]
        let before = month.staticTexts.allElementsBoundByIndex.map { $0.label }
        let next = app.buttons["下个月"]
        XCTAssertGreaterThanOrEqual(next.frame.width, 43.99)
        XCTAssertGreaterThanOrEqual(next.frame.height, 43.99)
        XCTAssertGreaterThanOrEqual(close.frame.width, 43.99)
        XCTAssertGreaterThanOrEqual(close.frame.height, 43.99)
        corner(next)
        let changed = NSPredicate { _, _ in month.staticTexts.allElementsBoundByIndex.map { $0.label } != before }
        XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: changed, object: nil)], timeout: 2), .completed, "月份箭头的 44 点区域边角必须可点")
        corner(app.buttons["选剧"].firstMatch)
        XCTAssertTrue(app.textFields["calendar-search"].waitForExistence(timeout: 2), "选剧按钮的透明边角必须可点")
        if app.buttons["完成"].exists { app.buttons["完成"].tap() }
        corner(close)
        XCTAssertTrue(close.waitForNonExistence(timeout: 2), "关闭按钮的 44 点区域边角必须可点")
        capture("calendar-touch-targets")
    }
    func testCalendarWeekSwipeAndRowTapRemainIndependent() {
        launch()
        app.buttons["open-calendar"].tap()
        XCTAssertTrue(app.buttons["关闭播出日历"].waitForExistence(timeout: 5))
        app.buttons["全部"].tap(); app.buttons["今天"].tap()
        let range = app.staticTexts["calendar-week-range"]
        let before = range.label
        let sheet = app.descendants(matching: .any)["source-bottom-sheet"]
        sheet.coordinate(withNormalizedOffset: CGVector(dx: 0.8, dy: 0.45)).press(forDuration: 0.05, thenDragTo: sheet.coordinate(withNormalizedOffset: CGVector(dx: 0.2, dy: 0.45)))
        XCTAssertNotEqual(range.label, before, "横滑必须切周")
        app.buttons["今天"].tap()
        let event = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "calendar-event-")).firstMatch
        XCTAssertTrue(event.waitForExistence(timeout: 5))
        let id = event.identifier.replacingOccurrences(of: "calendar-event-", with: "")
        event.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.2)).tap()
        let detail = app.descendants(matching: .any)["calendar-detail-" + id]
        XCTAssertTrue(detail.waitForExistence(timeout: 3), "切周手势不得吞掉剧集行点按")
        event.coordinate(withNormalizedOffset: CGVector(dx: 0.1, dy: 0.8)).tap()
        XCTAssertTrue(detail.waitForNonExistence(timeout: 3))
        let headerY=range.frame.minY, rowY=event.frame.minY
        sheet.coordinate(withNormalizedOffset:CGVector(dx:0.55,dy:0.72)).press(forDuration:0.05,thenDragTo:sheet.coordinate(withNormalizedOffset:CGVector(dx:0.55,dy:0.4)))
        XCTAssertLessThan(event.frame.minY,rowY,"纵向阅读滚动仍可用")
        XCTAssertEqual(range.frame.minY,headerY,accuracy:1,"日历工具栏保持固定")
        capture("calendar-swipe-and-tap")
    }
    func testCalendarFollowingAndMonthSwitch() {
        launch();app.buttons["open-calendar"].tap()
        XCTAssertTrue(app.buttons["关闭播出日历"].waitForExistence(timeout:5));XCTAssertEqual(app.descendants(matching:.any)["source-bottom-sheet"].frame.width,app.frame.width,accuracy:1);capture("calendar")
        app.buttons["选剧"].firstMatch.tap();XCTAssertTrue(app.textFields["calendar-search"].waitForExistence(timeout:5));capture("calendar-following")
        app.buttons["完成"].tap();XCTAssertTrue(app.buttons["我追的剧"].exists)
        app.buttons["全部"].tap();app.buttons["下个月"].tap();capture("calendar-next-month");app.buttons["今天"].tap()
        app.buttons["选择月份"].tap();capture("calendar-month-picker");app.buttons["关闭播出日历"].tap()
        XCTAssertTrue(app.buttons["open-calendar"].isHittable)
    }
    func testMemeCaptureCompletesAndExhaustsWithoutDuplicates() {
        launch("memes")
        let shutter=app.buttons["meme-shutter"]
        XCTAssertTrue(shutter.waitForExistence(timeout:5))
        for i in 0..<5 {
            if !shutter.isHittable {app.swipeDown()}
            shutter.tap()
            let saved=app.otherElements["meme-capture-\(i)"]
            let ready=NSPredicate(format:"enabled == true")
            if i<4 {expectation(for:ready,evaluatedWith:shutter);waitForExpectations(timeout:8)}
            else {sleep(4)}
            capture("meme-captured-\(i)")
            _=saved
        }
        XCTAssertFalse(shutter.isEnabled)
    }
    func testCpDirectoryMatchesFullWidthWebsiteSheet() {
        launch("cp", extra:["--cp","namtanfilm"])
        let trigger=app.buttons["cp-switcher"]
        XCTAssertTrue(trigger.waitForExistence(timeout:5));trigger.tap()
        let panel=app.descendants(matching:.any)["source-bottom-sheet"]
        XCTAssertTrue(panel.waitForExistence(timeout:5))
        XCTAssertEqual(panel.frame.minX,app.frame.minX,accuracy:1)
        XCTAssertEqual(panel.frame.width,app.frame.width,accuracy:1)
        XCTAssertFalse(app.keyboards.firstMatch.exists,"目录标题先获得焦点，搜索框不能自动弹出键盘")
        let search=app.textFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout:3));search.tap();search.typeText("EngLot")
        XCTAssertEqual(panel.frame.minX,app.frame.minX,accuracy:1)
        XCTAssertEqual(panel.frame.width,app.frame.width,accuracy:1)
        let keyboard=app.keyboards.firstMatch
        XCTAssertTrue(keyboard.waitForExistence(timeout:3))
        let visibleHeight=keyboard.frame.minY-app.frame.minY
        // A clipped SwiftUI accessibility container reports the union of its
        // offscreen children as its height. Its visible top still follows the
        // source website's 76dvh rule: about 24% below the visible viewport top.
        XCTAssertGreaterThanOrEqual(panel.frame.minY,app.frame.minY+visibleHeight*0.20,"键盘弹起后弹层顶部应按网页 76dvh 规则下移")
        XCTAssertLessThanOrEqual(panel.frame.minY,app.frame.minY+visibleHeight*0.30,"弹层不能缩得比网页目录更矮")
        XCTAssertTrue(app.buttons["cp-directory-engfacharlotte"].waitForExistence(timeout:3))
        capture("cp-directory-keyboard-full-width")
        app.buttons["关闭 CP 目录"].tap()
        XCTAssertTrue(trigger.waitForExistence(timeout:3))
    }
    func testAnnualSwipeRevealsFilmBelowHeader() {
        launch("archive",extra:["--archive-year","2024"])
        let film=app.scrollViews["annual-film"]
        XCTAssertTrue(film.waitForExistence(timeout:5))
        let before=film.frame.minY
        film.coordinate(withNormalizedOffset:CGVector(dx:0.8,dy:0.4)).press(forDuration:0.1,thenDragTo:film.coordinate(withNormalizedOffset:CGVector(dx:0.2,dy:0.4)))
        sleep(1)
        XCTAssertLessThan(film.frame.minY,before)
        XCTAssertGreaterThanOrEqual(film.frame.minY,93)
        if film.frame.minY > 115 {
            // Like window.scrollBy on the source website, a short document can
            // reach its bottom before the requested top alignment is possible.
            let settled = film.frame.minY
            app.swipeUp()
            XCTAssertEqual(film.frame.minY, settled, accuracy: 2, "较短详情应已滚到底，不额外制造空白")
        }
        capture("annual-after-first-swipe")
    }
    func testEnglishAndThaiAllRoots() {
        for locale in ["en","th"] {
            launch(locale:locale)
            for section in ["archive","cp","repo","memes"] {
                app.buttons["tab-"+section].tap();capture(locale+"-"+section)
                XCTAssertTrue(app.buttons["language-zh"].isHittable)
            }
        }
    }
}
