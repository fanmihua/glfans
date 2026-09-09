import "./rights-notice.css";

export const FILING_NUMBER = "京ICP备2025151071号-4";
export const FILING_URL = "https://beian.miit.gov.cn/";

export function FilingNotice({ className = "" }) {
  return (
    <a
      className={`site-filing-notice ${className}`.trim()}
      href={FILING_URL}
      target="_blank"
      rel="noreferrer"
      translate="no"
    >
      {FILING_NUMBER}
    </a>
  );
}
