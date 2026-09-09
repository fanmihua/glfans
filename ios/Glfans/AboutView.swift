import SwiftUI

struct AboutView: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.dismiss) var dismiss
    @AppStorage("glfans.hiddenQuotes") private var hidden = ""
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                PaperHeading(title: "关于这个坑", subtitle: "GLFANS · MADE WITH LOVE")
                Text(app.t("这次真的不一样。")).font(.title2.bold()).padding(14).background(Pit.ink).foregroundStyle(.white)
                Text(app.t("欢迎入坑，磕得开心最重要！")).font(.title3.bold())
                Text(app.t("每一份心动，都有迹可循。")).lineSpacing(5)
                Text(app.t("这是一个自嘲式泰百粉丝磕糖网站，记录泰百 CP 的入坑欣喜、 磕糖的上头、塌房的心酸，以及自嘲的嘴硬。二创是因为真的热爱， 也时刻提醒自己保留一点“良好心态”——")).font(.body).lineSpacing(5)
                Divider()
                Text(app.t("语言")).font(.headline)
                Picker(app.t("语言"), selection: $app.locale) { Text("中文").tag("zh"); Text("English").tag("en"); Text("ไทย").tag("th") }.pickerStyle(.segmented)
                Divider()
                HStack(alignment: .top, spacing: 20) {
                    VStack(alignment: .leading, spacing: 10) { Text("Conceal").font(.title3.bold()); Text(app.t("写字的，收藏心动与情绪。")).font(.subheadline); Text(app.t("让爱有迹可循。")).font(.caption) }
                    Divider()
                    VStack(alignment: .leading, spacing: 10) { Text("范米花儿").font(.title3.bold()); Text(app.t("做页面的，搭建与维护这个小窝。")).font(.subheadline); Text(app.t("让热爱有处安放。")).font(.caption) }
                }.fixedSize(horizontal: false, vertical: true)
                Divider()
                DisclosureGroup(app.t("版权与使用说明")) {
                    VStack(alignment: .leading, spacing: 14) {
                        Text(app.t("非官方粉丝共创站 · 非商业用途 · 第三方素材相关权利归原权利人"))
                        Text(app.t("glfans 是由粉丝自发维护的非商业共创网站，与相关艺人、经纪公司、 剧集制作方、发行平台及品牌不存在隶属、合作或授权关系，页面另有明确说明的除外。"))
                        Text(app.t("网站原创文字、设计、编排和代码归相应创作者所有。页面涉及的艺人姓名与肖像、 剧照、海报、节目截图、歌曲、官方视频及其他第三方素材，其相关权利归原权利人所有。 引用内容主要用于作品介绍、评论和资料整理，不代表 glfans 对相关素材拥有权利。"))
                        Text(app.t("表情包仅供粉丝交流使用，相关素材权利归原权利人。"))
                        Link(app.t("权利反馈"), destination: URL(string: "https://github.com/fanmihua/glfans/issues/new?template=rights-feedback.yml")!)
                    }.font(.footnote).lineSpacing(4).padding(.top, 12)
                }
                DisclosureGroup(app.t("隐私与数据")) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(app.t("关注列表与语言偏好保存在此设备。评论、原话与点赞使用网站现有社区服务；你主动发布的内容会公开显示。"))
                        Text(app.t("仅在保存表情包时请求添加照片权限。电台播放时访问远程音源。"))
                    }.font(.footnote).padding(.top, 12)
                }
                if !hidden.isEmpty { Button(app.t("恢复隐藏的内容")) { hidden = "" }.frame(minHeight: 44) }
                Link("GitHub · glfans", destination: URL(string: "https://github.com/fanmihua/glfans")!).frame(minHeight: 44)
                Text("glfans iOS · 1.0.0").font(.caption.monospaced()).foregroundStyle(.secondary)
            }.padding(24)
        }.background(Pit.paper).navigationBarTitleDisplayMode(.inline).toolbar { ToolbarItem(placement: .confirmationAction) { Button(app.t("完成")) { dismiss() } } }
    }
}
