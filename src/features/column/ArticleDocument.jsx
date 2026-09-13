import { t } from "../../i18n/runtime.js";
import { useMemo } from "react";
import { withBase } from "../../lib/assets.js";

function renderChildren(node, keyPrefix) {
  return Array.from(node.childNodes).map((child, index) => renderNode(child, `${keyPrefix}-${index}`));
}

function nodeHasMeaningfulContent(node) {
  if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent?.trim());
  if (node.nodeType !== Node.ELEMENT_NODE) return false;

  const tag = node.tagName.toLowerCase();
  if (tag === "img") return Boolean(node.getAttribute("href"));
  if (tag === "bitable") return false;
  return Array.from(node.childNodes).some(nodeHasMeaningfulContent);
}

function describeColumn(column) {
  const media = Array.from(column.querySelectorAll("img[href]"));
  const textNodes = Array.from(column.querySelectorAll("p, h1, h2, h3, blockquote, quote, li, callout, table"));
  const textLength = textNodes.reduce((total, node) => total + (node.textContent?.trim().length || 0), 0);
  return {
    hasMedia: media.length > 0,
    hasText: textLength > 0,
    mediaCount: media.length,
    textLength,
  };
}

function renderNode(node, key, layoutIndex = null) {
  if (node.nodeType === Node.TEXT_NODE) {
    // Quotes and original speaker labels are source material, not site copy.
    const parent = node.parentElement;
    const speaker = parent?.tagName.toLowerCase() === 'p' && /^[\p{L}\p{N}.'’·_\-\s]{1,24}[：:]$/u.test(parent.textContent.trim());
    return speaker || parent?.closest('blockquote, quote') ? node.textContent : t(node.textContent);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const tag = node.tagName.toLowerCase();
  const children = renderChildren(node, key);
  const text = node.textContent?.trim() ?? "";

  if (tag === "doc" || tag === "fragment" || tag === "column") {
    const className = tag === "column" ? "fs-column" : tag === "fragment" ? "fs-fragment" : undefined;
    return <div className={className} key={key}>{t(children)}</div>;
  }

  if (tag === "grid") {
    const columns = Array.from(node.children).filter((child) => {
      return child.tagName.toLowerCase() === "column" && nodeHasMeaningfulContent(child);
    });
    if (columns.length === 0) return null;

    const profiles = columns.map(describeColumn);
    const hasMedia = profiles.some((profile) => profile.hasMedia);
    const hasText = profiles.some((profile) => profile.hasText);
    const mediaCount = profiles.reduce((total, profile) => total + profile.mediaCount, 0);
    const textLength = profiles.reduce((total, profile) => total + profile.textLength, 0);
    const isSplit = columns.length > 1 && hasMedia && hasText;
    const template = columns.map((column) => `${Number(column.getAttribute("width-ratio")) || 1}fr`).join(" ");
    const layoutClasses = ["fs-grid", "article-section"];
    if (layoutIndex !== null) {
      if (isSplit) {
        layoutClasses.push("article-layout-split");
        layoutClasses.push(layoutIndex % 2 === 0 ? "article-layout-media-left" : "article-layout-media-right");
        if (textLength < mediaCount * 260) {
          layoutClasses.push("article-layout-media-heavy");
          layoutClasses.push(mediaCount === 1 ? "article-media-count-one" : "article-media-count-many");
        } else if (textLength > Math.max(640, mediaCount * 520)) {
          layoutClasses.push("article-layout-copy-heavy");
        }
      } else if (hasMedia && !hasText) {
        layoutClasses.push("article-layout-gallery");
      } else if (hasText && !hasMedia) {
        layoutClasses.push("article-layout-text");
      } else {
        layoutClasses.push("article-layout-single");
      }
    }
    return (
      <div
        className={layoutClasses.join(" ")}
        data-section={layoutIndex === null ? undefined : String(layoutIndex + 1).padStart(2, "0")}
        style={{ "--fs-columns": template }}
        key={key}
      >
        {t(columns.map((column, index) => (
          <div
            className={`fs-column${profiles[index].hasMedia ? " is-media" : ""}${profiles[index].hasText ? " is-copy" : ""}`}
            key={`${key}-column-${index}`}
          >
            {t(renderChildren(column, `${key}-column-${index}`))}
          </div>
        )))}
      </div>
    );
  }

  if (tag === "title") return <h1 className="fs-title" key={key}>{t(children)}</h1>;
  if (tag === "h1") return <h2 className="fs-heading fs-heading-one" key={key}>{t(children)}</h2>;
  if (tag === "h2") return <h2 className="fs-heading fs-heading-two" key={key}>{t(children)}</h2>;
  if (tag === "h3") return <h3 className="fs-heading fs-heading-three" key={key}>{t(children)}</h3>;

  if (tag === "p") {
    if (!text && node.children.length === 0) return <div className="fs-spacer" aria-hidden="true" key={key} />;
    const isSpeaker = /^[\p{L}\p{N}.'’·_\-\s]{1,24}[：:]$/u.test(text);
    return (
      <p
        className={`fs-paragraph${isSpeaker ? " is-speaker" : ""}`}
        style={{ textAlign: node.getAttribute("align") || undefined }}
        key={key}
      >
        {t(children)}
      </p>
    );
  }

  if (tag === "img") {
    const imageName = node.getAttribute("name");
    // Imported filenames are not useful alternative text. Keep descriptive names,
    // but do not expose source filesystem labels such as “截屏2025-…png”.
    const imageDescription = imageName && !/\.(?:png|jpe?g|webp|gif|avif)$/i.test(imageName) ? imageName : "文章配图";
    return (
      <figure className="fs-figure" key={key}>
        <img
          src={withBase(node.getAttribute("href"))}
          alt={t(imageDescription)}
          width={node.getAttribute("width") || undefined}
          height={node.getAttribute("height") || undefined}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
      </figure>
    );
  }

  if (tag === "a") {
    return (
      <a href={node.getAttribute("href") || "#"} target="_blank" rel="noreferrer" key={key}>
        {t(children)}
      </a>
    );
  }

  if (tag === "b" || tag === "strong") return <strong key={key}>{t(children)}</strong>;
  if (tag === "i" || tag === "em") return <em key={key}>{t(children)}</em>;
  if (tag === "u") return <u key={key}>{t(children)}</u>;
  if (tag === "del" || tag === "s" || tag === "strike") return null;
  if (tag === "blockquote" || tag === "quote") return <blockquote className="fs-quote" translate="no" key={key}>{children}</blockquote>;
  if (tag === "hr") return <hr className="fs-rule" key={key} />;
  if (tag === "br") return <br key={key} />;

  if (tag === "span") {
    return <span style={{ color: node.getAttribute("text-color") || undefined }} key={key}>{t(children)}</span>;
  }

  if (tag === "ul") return <ul className="fs-list" key={key}>{t(children)}</ul>;
  if (tag === "ol") return <ol className="fs-list" key={key}>{t(children)}</ol>;
  if (tag === "li") return <li key={key}>{t(children)}</li>;

  if (tag === "callout") {
    return (
      <aside
        className="fs-callout"
        style={{
          backgroundColor: node.getAttribute("background-color") || undefined,
          borderColor: node.getAttribute("border-color") || undefined,
        }}
        key={key}
      >
        <span aria-hidden="true">{t(node.getAttribute("emoji"))}</span>
        <div>{t(children)}</div>
      </aside>
    );
  }

  if (tag === "table") return <div className="fs-table-wrap" key={key}><table>{t(children)}</table></div>;
  if (tag === "thead") return <thead key={key}>{t(children)}</thead>;
  if (tag === "tbody") return <tbody key={key}>{t(children)}</tbody>;
  if (tag === "tr") return <tr key={key}>{t(children)}</tr>;
  if (tag === "th") return <th key={key}>{t(children)}</th>;
  if (tag === "td") return <td key={key}>{t(children)}</td>;
  if (tag === "bitable") return null;

  return <div className={`fs-block fs-${tag}`} key={key}>{t(children)}</div>;
}

export function ArticleDocument({ xml, overview = false, hideTitle = false, hideLeadHeading = false }) {
  const document = useMemo(() => {
    const parsed = new DOMParser().parseFromString(`<doc>${xml}</doc>`, "application/xml");
    return parsed.querySelector("parsererror") ? null : parsed.documentElement;
  }, [xml]);

  if (!document) return <p className="column-empty">{t("这篇内容暂时无法解析。")}</p>;

  const nodes = Array.from(document.childNodes).filter((node) => {
    if (!overview || node.nodeType !== Node.ELEMENT_NODE) return true;
    return node.tagName.toLowerCase() !== "fragment";
  });

  let leadHeadingRemoved = false;
  const content = (overview
    ? Array.from(document.querySelector("fragment")?.childNodes ?? []).filter((node) => {
        return node.nodeType !== Node.ELEMENT_NODE || node.tagName.toLowerCase() !== "h1";
      })
    : nodes).filter((node) => {
      const tag = node.nodeType === Node.ELEMENT_NODE ? node.tagName.toLowerCase() : "";
      if (hideTitle && tag === "title") return false;
      if (hideLeadHeading && !leadHeadingRemoved && tag === "h1") {
        leadHeadingRemoved = true;
        return false;
      }
      return nodeHasMeaningfulContent(node);
    });

  let gridIndex = 0;
  const blocks = [];
  let flowNodes = [];
  const flushFlow = () => {
    if (flowNodes.length === 0) return;
    const flowIndex = blocks.length;
    blocks.push(
      <section className="article-flow" key={`flow-${flowIndex}`}>
        {t(flowNodes.map((node, index) => renderNode(node, `flow-${flowIndex}-${index}`)))}
      </section>,
    );
    flowNodes = [];
  };

  content.forEach((node, index) => {
    const isGrid = node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === "grid";
    if (!isGrid) {
      flowNodes.push(node);
      return;
    }
    flushFlow();
    blocks.push(renderNode(node, `fs-${index}`, gridIndex++));
  });
  flushFlow();

  return (
    <div className={overview ? "article-document is-overview" : "article-document"}>
      {t(blocks)}
    </div>
  );
}
