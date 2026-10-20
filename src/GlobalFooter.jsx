import { t } from "./i18n/runtime.js";
import { HeartStraight } from "@phosphor-icons/react";
import { RightsNotice } from "./RightsNotice.jsx";
import "./global-footer.css";

export function GlobalFooter() {
  return (
    <footer className="global-footer" aria-label={t("glfans 全站页尾")}>
      <a className="global-footer-brand" href="#/about" aria-label={t("关于 glfans")}>{t("glfans")}</a>
      <span className="global-footer-credits">
        <span><b>{t("Content & UX")}</b>{t(" / Conceal")}</span>
        <span><b>{t("Design & Dev")}</b><span translate="no"> / 范米花儿</span></span>
      </span>
      <span className="global-footer-love" tabIndex="0">
        <i>{t("love is love")}</i>
        <HeartStraight weight="fill" aria-hidden="true" />
      </span>
      <RightsNotice className="global-footer-rights" linkLabel="权利说明与反馈" />
    </footer>
  );
}
