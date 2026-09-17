import Foundation

struct WebsiteContent: Decodable {
    struct About: Decodable {
        struct Rights: Decodable, Identifiable {
            var id: String { title }
            let title: String
            let text: String
        }
        let intro: String
        let emphasis: String
        let rights: [Rights]
        let copyright: String
    }
    struct Film: Decodable, Identifiable {
        var id: String { image }
        let image: String
        let focus: String
    }
    struct FrequencyWord: Decodable { let name: String; let value: Int; let x: Double; let y: Double; let tilt: Double }
    struct Point: Decodable { let x: Double; let y: Double }
    struct Segment: Decodable { let start: Point; let control1: Point; let control2: Point; let end: Point }
    let frequencyWords: [FrequencyWord]
    let frequencySegments: [Segment]
    let about: About
    let footerFilm: [Film]
    static let shared: WebsiteContent? = {
        guard let url = Bundle.main.resourceURL?.appendingPathComponent("Generated/source-content.json"), let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(WebsiteContent.self, from: data)
    }()
}
