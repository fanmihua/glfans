import { t } from "./i18n/runtime.js";
import { FilingNotice } from "./FilingNotice.jsx";
import { RIGHTS_SHORT_NOTICE } from "./rights.js";

// Page-specific wording and desktop positioning stay with their existing hosts.
export function RightsNotice({ className = "", notice = RIGHTS_SHORT_NOTICE, linkLabel = "权利说明" }) {
  return (
    <p className={`site-rights-notice ${className}`}>
      <span>{t(notice)}</span>
      <a href="#/about/rights">{t(linkLabel)}</a>
      <span className="site-rights-separator" aria-hidden="true">·</span>
      <FilingNotice />
    </p>
  );
}
