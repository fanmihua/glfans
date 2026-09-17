import SwiftUI
import GlfansCore

struct SafetyTarget: Identifiable {
    let type: String
    let id: String
    let text: String
    var canBlock = false
}

enum SupportContact {
    static var email: String {
        let value = Bundle.main.object(forInfoDictionaryKey:"GLFansSupportEmail") as? String ?? ""
        return value.isEmpty || value.contains("$(") ? "fan422601@gmail.com" : value
    }
    static var url: URL { URL(string:"mailto:" + email)! }
}

struct CommunitySafetySheet: View {
    let target: SafetyTarget
    var onBlocked: () -> Void = {}
    @EnvironmentObject private var app: AppModel
    @EnvironmentObject private var community: CommunityStore
    @Environment(\.dismiss) private var dismiss
    @State private var reason = "abuse"
    @State private var detail = ""
    @State private var busy = false
    @State private var error: String?
    @State private var receipt: String?
    @State private var confirmBlock = false
    private let reasons = [("abuse","骚扰或歧视"),("sexual","色情内容"),("violence","暴力或威胁"),("spam","垃圾广告"),("rights","侵犯权利"),("other","其他问题")]
    var body: some View {
        SourceCommunitySheet(title:app.t("举报与屏蔽"),close:{dismiss()}) {
            ScrollView {
                VStack(alignment:.leading,spacing:14) {
                    Text(target.text).sourceFont(14).lineLimit(4).padding(12).frame(maxWidth:.infinity,alignment:.leading).background(.white)
                    if let receipt {
                        Text(app.t("举报已收到")).sourceFont(18,weight:750)
                        Text(app.t("处理结果可在关于页的举报记录中查看。")).sourceFont(13)
                        Text(receipt).sourceFont(10).textSelection(.enabled)
                    } else {
                        Picker(app.t("举报原因"),selection:$reason) { ForEach(reasons,id:\.0) { value in Text(app.t(value.1)).tag(value.0) } }.pickerStyle(.menu)
                        Text(app.t("补充说明（选填，最多 500 字）")).sourceFont(12)
                        TextEditor(text:$detail).sourceFont(16).frame(height:90).accessibilityIdentifier("report-detail")
                            .onChange(of:detail) {_,value in if value.unicodeScalars.count>500 {detail=String(value.unicodeScalars.prefix(500))}}
                        Text(app.t("请勿填写身份证、住址等敏感信息。")).sourceFont(11).foregroundStyle(.secondary)
                    }
                    if target.canBlock {
                        Button(app.t("屏蔽这位作者"),role:.destructive) {confirmBlock=true}.frame(minHeight:44).accessibilityIdentifier("block-author")
                    }
                    if let error {Text(app.t(error)).sourceFont(12).foregroundStyle(Pit.pink)}
                    Link(app.t("联系客服") + " · " + SupportContact.email,destination:SupportContact.url).sourceFont(12).frame(minHeight:44)
                }.padding(18)
            }
        } footer: {
            Button {
                if receipt != nil {dismiss();return}
                busy=true
                Task {do {receipt=try await community.report(type:target.type,id:target.id,reason:reason,detail:detail);error=nil} catch {self.error=error.localizedDescription};busy=false}
            } label: {Text(app.t(receipt != nil ? "完成" : busy ? "正在送出" : "提交举报")).sourceFont(14,weight:750).frame(maxWidth:.infinity,minHeight:44).background(Pit.ink).foregroundStyle(.white)}
                .disabled(busy).padding(18).accessibilityIdentifier("submit-report")
        }.buttonStyle(SourceButtonStyle()).sourceSheet(height:600)
            .confirmationDialog(app.t("屏蔽后将不再显示这位作者的原话和评论，可在关于页解除。"),isPresented:$confirmBlock,titleVisibility:.visible) {
                Button(app.t("屏蔽这位作者"),role:.destructive) {
                    busy=true;Task {do {try await community.block(type:target.type,id:target.id);onBlocked();dismiss()} catch {self.error=error.localizedDescription};busy=false}
                }
                Button(app.t("取消"),role:.cancel) {}
            }
    }
}

struct PrivacyAndCommunityControls: View {
    @EnvironmentObject private var app: AppModel
    @EnvironmentObject private var community: CommunityStore
    @State private var document: String?
    @State private var confirmDelete = false
    @State private var error: String?
    @State private var deleted = false
    @State private var reports: [SafetyReport] = []
    @State private var reportsOpen = false
    var body: some View {
        VStack(alignment:.leading,spacing:10) {
            Text(app.t("浏览内容无需注册。首次点赞、发布或举报时会建立匿名社区身份，用于保存互动与处理滥用。")).sourceFont(12).fixedSize(horizontal:false,vertical:true)
            Text(app.t("语言与关注保存在此设备；昵称、公开投稿、互动及举报由社区服务处理。保存图片时仅请求添加照片权限，播放音乐时访问音源服务。")).sourceFont(12).fixedSize(horizontal:false,vertical:true)
            Link(app.t("联系客服") + " · 范米花儿 · " + SupportContact.email,destination:SupportContact.url).sourceFont(12).frame(minHeight:44)
            if let path=Bundle.main.object(forInfoDictionaryKey:"GLFansPrivacyHostPath") as? String,!path.isEmpty,!path.contains("$("),let url=URL(string:"https://"+path) {
                Link(app.t("完整隐私政策"),destination:url).sourceFont(12).frame(minHeight:44)
            }
            DisclosureGroup(app.t("社区规范")) {
                Text(app.t("请尊重他人，不发布骚扰、歧视、威胁、色情、垃圾广告或侵犯他人权利的内容。可在原话或评论的更多菜单中举报和屏蔽；管理员会核查并处理违规内容。匿名身份不用于随机配对或私聊。")).sourceFont(12).padding(.vertical,8)
            }.sourceFont(12).frame(minHeight:44).accessibilityIdentifier("community-guidelines")
            if !community.blocks.isEmpty {
                DisclosureGroup(app.t("已屏蔽的作者")) {
                    ForEach(Array(community.blocks.enumerated()),id:\.element.id) { index,item in
                        HStack {Text(app.t("作者") + " \(index+1)").sourceFont(12);Spacer();Button(app.t("解除屏蔽")) {Task{do{try await community.unblock(item.author_key)}catch{self.error=error.localizedDescription}}}.frame(minHeight:44)}
                    }
                }.sourceFont(12)
            }
            if community.hasIdentity {
                Button(app.t("举报记录")) {reportsOpen.toggle();if reportsOpen {Task{do{reports=try await community.myReports()}catch{self.error=error.localizedDescription}}}}.sourceFont(12).frame(minHeight:44)
                if reportsOpen {
                    ForEach(reports) { report in
                        HStack {Text(report.created_at.prefix(10));Spacer();Text(app.t(report.status=="open" ? "待处理":report.status=="actioned" ? "已处理":"已核查"))}.sourceFont(12)
                    }
                    if reports.isEmpty {Text(app.t("暂无举报记录")).sourceFont(12)}
                }
                Button(app.t(community.deletingAccount ? "正在删除账号" : "删除匿名账号与数据"),role:.destructive) {confirmDelete=true}.sourceFont(12).frame(minHeight:44).disabled(community.deletingAccount).accessibilityIdentifier("delete-community-account")
            }
            if deleted {Text(app.t("账号与关联数据已删除。继续浏览不会重新注册。")).sourceFont(12)}
            if let error {Text(app.t(error)).sourceFont(12).foregroundStyle(Pit.pink)}
        }.buttonStyle(SourceButtonStyle()).task {await community.refreshSafety()}
        .alert(app.t("删除匿名账号与数据？"),isPresented:$confirmDelete) {
            Button(app.t("取消"),role:.cancel) {}
            Button(app.t("永久删除"),role:.destructive) {
                Task {do {try await community.deleteAccount();deleted=true;error=nil;reports=[]} catch {self.error=error.localizedDescription}}
            }
        } message: {
            Text(app.t("将永久删除此匿名账号、发布的原话及其评论线程、你的其他评论、点赞、浏览和举报记录，并清除本机昵称及草稿。此操作无法撤销。语言与关注列表保留；以后主动互动时会创建新身份。"))
        }
    }
}

struct SafetyReport: Decodable, Identifiable {
    let id: String
    let status: String
    let created_at: String
}
