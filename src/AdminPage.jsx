import { t } from "./i18n/runtime.js";
import { withBase } from "./lib/assets.js";
import { SITE_LOGO } from "./app/brand.js";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeSlash,
  Funnel,
  Heart,
  SignOut,
  SpinnerGap,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAdminQuote,
  isCommunityConfigured,
  loadAdminDashboard,
  loadAdminSession,
  loginAdmin,
  logoutAdmin,
  updateAdminComment,
  updateAdminQuote,
} from "./community-api.js";
import { attemptAdminLogout } from "./features/community/admin-session-state.js";
import "./admin-page.css";

const statusOptions = [
  { id: "published", label: "已公开" },
  { id: "hidden", label: "已隐藏" },
];
const quoteStatusOptions = [
  { id: "published", label: "公开" },
  { id: "draft", label: "草稿" },
  { id: "hidden", label: "隐藏" },
];


function formatTarget(comment, quoteById) {
  if (comment.target_type === "page") return "坑底留言板";
  const quote = quoteById.get(comment.target_id);
  return quote ? `${comment.target_id.toUpperCase()} · ${quote.text}` : comment.target_id;
}

function AdminHeader({ onSignOut, signedIn }) {
  return (
    <header className="community-admin-header">
      <a className="community-admin-brand" href="#/">
        <img className="brand-logo" src={withBase(SITE_LOGO.src)} width={SITE_LOGO.width} height={SITE_LOGO.height} alt={t(SITE_LOGO.alt)} />
        <span>{t("COMMUNITY DESK")}</span>
      </a>
      <div>
        <a href="#/tide-words"><ArrowLeft weight="bold" aria-hidden="true" />{t("返回坑底文学")}</a>
        {t(signedIn ? (
          <button type="button" onClick={onSignOut}><SignOut weight="bold" aria-hidden="true" />{t("退出")}</button>
        ) : null)}
      </div>
    </header>
  );
}

function AdminLogin({ onAuthenticated }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setState("submitting");
    setErrorMessage("");
    try {
      const session = await loginAdmin(email, password);
      setState("success");
      onAuthenticated(session);
    } catch {
      setState("error");
      setErrorMessage("邮箱或密码不对，或者账号还没有启用。 ");
    }
  };

  return (
    <section className="community-admin-login" aria-labelledby="community-admin-login-title">
      <span>{t("PRIVATE ENTRY")}</span>
      <h1 id="community-admin-login-title">{t("坑底编辑台")}</h1>
      <p>{t("这里不靠隐藏地址保护。只有服务器数据库中已启用的本地管理员账号能够管理内容。")}</p>
      <form onSubmit={handleSubmit}>
        <label>
          <span>{t("管理员邮箱")}</span>
          <input type="email" value={email} autoComplete="username" required onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          <span>{t("密码")}</span>
          <input type="password" value={password} autoComplete="current-password" required onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button type="submit" disabled={state === "submitting"}>
          {t(state === "submitting" ? <SpinnerGap className="is-spinning" aria-hidden="true" /> : null)}
          {t(state === "submitting" ? "正在核对" : "进入后台")}
        </button>
        <p className="community-admin-form-message" aria-live="polite">{t(errorMessage)}</p>
      </form>
    </section>
  );
}

function AdminSetupNotice() {
  return (
    <section className="community-admin-setup" aria-labelledby="community-admin-setup-title">
      <span>{t("BACKEND NOT CONNECTED")}</span>
      <h1 id="community-admin-setup-title">{t("后台代码已经到位，数据服务还没接线。")}</h1>
      <p>{t("当前静态回滚版本没有连接社区 API；主站服务器启动后，后台登录和审核功能才会开放。")}</p>
      <ol>
        <li>{t("执行仓库中的 MySQL migration 与 seed。")}</li>
        <li>{t("创建本地管理员账号并启动 Node API。")}</li>
        <li>{t("确认 Nginx 已把 ")}<code>{t("/api/")}</code>{t(" 转发到本机服务。")}</li>
      </ol>
      <a href="#/tide-words">{t("先返回坑底文学")}</a>
    </section>
  );
}

function QuoteEditor({ busy, onSave, quote }) {
  const [text, setText] = useState(quote.text);
  const [speaker, setSpeaker] = useState(quote.speaker);
  const [status, setStatus] = useState(quote.status);
  const [sortOrder, setSortOrder] = useState(quote.sort_order);
  const [isPinned, setIsPinned] = useState(Boolean(quote.is_pinned));

  useEffect(() => {
    setText(quote.text);
    setSpeaker(quote.speaker);
    setStatus(quote.status);
    setSortOrder(quote.sort_order);
    setIsPinned(Boolean(quote.is_pinned));
  }, [quote]);

  return (
    <form className="community-admin-quote-editor" onSubmit={(event) => {
      event.preventDefault();
      onSave(quote.id, { text, speaker, status, sort_order: Number(sortOrder) || 0, is_pinned: isPinned });
    }}>
      <span>{t(quote.id.toUpperCase())}</span>
      <label>
        <span>{t("原话")}</span>
        <textarea value={text} minLength={2} maxLength={120} required rows={3} onChange={(event) => setText(event.target.value)} />
      </label>
      <div>
        <label>
          <span>{t("署名")}</span>
          <input value={speaker} maxLength={40} required onChange={(event) => setSpeaker(event.target.value)} />
        </label>
        <label>
          <span>{t("顺序")}</span>
          <input type="number" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
        </label>
      </div>
      <div className="community-admin-quote-footer">
        <label className="community-admin-pin-toggle">
          <input type="checkbox" checked={isPinned} onChange={(event) => setIsPinned(event.target.checked)} />
          <span>{t("置顶")}</span>
        </label>
        <select value={status} aria-label={t(`${quote.id} 展示状态`)} onChange={(event) => setStatus(event.target.value)}>
          {t(quoteStatusOptions.map((option) => <option value={option.id} key={option.id}>{t(option.label)}</option>))}
        </select>
        <button type="submit" disabled={busy}>{t(busy ? "保存中" : "保存卡片")}</button>
      </div>
    </form>
  );
}

function AdminDashboard({ logoutMessage, session, onSignOut }) {
  const [comments, setComments] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState("published");
  const [state, setState] = useState("loading");
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");
  const [newQuoteText, setNewQuoteText] = useState("");

  const loadDashboard = useCallback(async () => {
    setState("loading");
    const dashboard = await loadAdminDashboard();
    setComments(dashboard.comments ?? []);
    setQuotes(dashboard.quotes ?? []);
    setStats(dashboard.stats ?? {});
    setState("ready");
  }, []);

  useEffect(() => {
    loadDashboard().catch(() => setState("error"));
  }, [loadDashboard]);

  const filteredComments = useMemo(() => comments.filter((comment) => comment.status === filter), [comments, filter]);
  const quoteById = useMemo(() => new Map(quotes.map((quote) => [quote.id, quote])), [quotes]);
  const totals = useMemo(() => Object.values(stats).reduce((sum, item) => ({
    comments: sum.comments + item.comments,
    likes: sum.likes + item.likes,
    views: sum.views + item.views,
  }), { comments: 0, likes: 0, views: 0 }), [stats]);

  const moderate = async (commentId, nextStatus) => {
    setBusyId(commentId);
    setMessage("");
    try {
      await updateAdminComment(commentId, { status: nextStatus });
      setComments((current) => current.map((comment) => (
        comment.id === commentId ? { ...comment, status: nextStatus } : comment
      )));
      setMessage(nextStatus === "published" ? "已经公开。" : "已经隐藏。 ");
    } catch {
      setMessage("这条回声没有更新成功，请检查管理员权限。 ");
    }
    setBusyId(null);
  };

  const saveQuote = async (quoteId, patch) => {
    setBusyId(quoteId);
    setMessage("");
    try {
      const data = await updateAdminQuote(quoteId, patch);
      setQuotes((current) => current.map((quote) => quote.id === quoteId ? data : quote).sort((a, b) => a.sort_order - b.sort_order));
      setMessage("卡片已经保存。 ");
    } catch {
      setMessage("卡片没有保存成功，请检查内容长度和管理员权限。 ");
    }
    setBusyId(null);
  };

  const createQuote = async (event) => {
    event.preventDefault();
    const text = newQuoteText.trim();
    if (text.length < 2) return;
    setBusyId("new-quote");
    setMessage("");
    const nextSortOrder = Math.max(0, ...quotes.map((quote) => quote.sort_order || 0)) + 10;
    try {
      const data = await createAdminQuote({ text, speaker: "匿名坑底人", sort_order: nextSortOrder, status: "draft", is_pinned: false });
      setQuotes((current) => [...current, data]);
      setNewQuoteText("");
      setMessage("新卡片已保存为草稿。 ");
    } catch {
      setMessage("新卡片没有建好，请检查管理员权限。 ");
    }
    setBusyId(null);
  };

  return (
    <>
      <AdminHeader signedIn onSignOut={onSignOut} />
      <main className="community-admin-dashboard">
        <section className="community-admin-masthead">
          <div>
            <span>{t("GLFANS / COMMUNITY DESK")}</span>
            <h1>{t("坑底编辑台")}</h1>
            <p>{t(session.user.email)}</p>
          </div>
          <dl>
            <div><dt><Eye aria-hidden="true" />{t("浏览")}</dt><dd>{t(totals.views)}</dd></div>
            <div><dt><Heart aria-hidden="true" />{t("心动")}</dt><dd>{t(totals.likes)}</dd></div>
            <div><dt><Check aria-hidden="true" />{t("公开回声")}</dt><dd>{t(totals.comments)}</dd></div>
          </dl>
        </section>
        {logoutMessage ? <p className="community-admin-message" role="alert">{t(logoutMessage)}</p> : null}

        <section className="community-admin-content" aria-labelledby="community-admin-content-title">
          <header>
            <div>
              <span>{t("VOICE CARDS")}</span>
              <h2 id="community-admin-content-title">{t("原话卡片")}</h2>
              <p>{t("编辑文字、署名、顺序和公开状态；隐藏卡片不会从数据库删除。")}</p>
            </div>
            <form className="community-admin-new-quote" onSubmit={createQuote}>
              <label htmlFor="community-new-quote">{t("新卡片")}</label>
              <input id="community-new-quote" value={newQuoteText} maxLength={120} placeholder={t("先写一句，默认保存为草稿")} onChange={(event) => setNewQuoteText(event.target.value)} />
              <button type="submit" disabled={busyId === "new-quote" || newQuoteText.trim().length < 2}>{t("新增草稿")}</button>
            </form>
          </header>
          <div className="community-admin-quote-grid">
            {t(quotes.map((quote) => (
              <QuoteEditor busy={busyId === quote.id} key={quote.id} quote={quote} onSave={saveQuote} />
            )))}
          </div>
        </section>

        <section className="community-admin-review" aria-labelledby="community-admin-review-title">
          <header>
            <div>
              <span><Funnel weight="bold" aria-hidden="true" />{t("RESPONSE MANAGER")}</span>
              <h2 id="community-admin-review-title">{t("回声管理")}</h2>
            </div>
            <div className="community-admin-filters" aria-label={t("按状态筛选")}>
              {t(statusOptions.map((option) => (
                <button
                  type="button"
                  aria-pressed={filter === option.id}
                  onClick={() => setFilter(option.id)}
                  key={option.id}
                >
                  {t(option.label)}
                  <small>{t(comments.filter((comment) => comment.status === option.id).length)}</small>
                </button>
              )))}
            </div>
          </header>
          <p className="community-admin-message" aria-live="polite">{t(message)}</p>

          {t(state === "loading" ? (
            <p className="community-admin-state"><SpinnerGap className="is-spinning" aria-hidden="true" />{t("正在整理回声")}</p>
          ) : null)}
          {t(state === "error" ? <p className="community-admin-state">{t("数据没有打开。请确认 migration 和管理员名单。")}</p> : null)}
          {t(state === "ready" && !filteredComments.length ? <p className="community-admin-state">{t("这一栏现在是空的。")}</p> : null)}

          <ol className="community-admin-comment-list">
            {filteredComments.map((comment) => (
              <li key={comment.id}>
                <div className="community-admin-comment-meta">
                  <strong>{comment.nickname}</strong>
                  <time dateTime={comment.created_at}>{t(new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(comment.created_at)))}</time>
                </div>
                <span className="community-admin-target">{t(formatTarget(comment, quoteById))}</span>
                <p>{comment.body}</p>
                <div className="community-admin-comment-actions">
                  {t(comment.status !== "published" ? (
                    <button type="button" disabled={busyId === comment.id} onClick={() => moderate(comment.id, "published")}>
                      <Eye weight="bold" aria-hidden="true" />{t("公开")}</button>
                  ) : null)}
                  {t(comment.status !== "hidden" ? (
                    <button type="button" disabled={busyId === comment.id} onClick={() => moderate(comment.id, "hidden")}>
                      <EyeSlash weight="bold" aria-hidden="true" />{t("隐藏")}</button>
                  ) : null)}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  );
}

export function AdminPage() {
  const [session, setSession] = useState(null);
  const [authState, setAuthState] = useState(isCommunityConfigured ? "loading" : "unconfigured");
  const [authMessage, setAuthMessage] = useState("");

  const verifyAdmin = useCallback(async (nextSession) => {
    if (!nextSession?.user || nextSession.user.kind !== "admin" || nextSession.user.role !== "admin") {
      setSession(null);
      setAuthState("signed-out");
      return;
    }
    setAuthMessage("");
    setSession(nextSession);
    setAuthState("ready");
  }, []);

  useEffect(() => {
    if (!isCommunityConfigured) return undefined;
    let alive = true;
    loadAdminSession()
      .then((nextSession) => {
        if (alive) verifyAdmin(nextSession);
      })
      .catch((error) => {
        if (!alive) return;
        setSession(null);
        setAuthState(error?.code === "admin_forbidden" ? "forbidden" : "signed-out");
      });
    return () => {
      alive = false;
    };
  }, [verifyAdmin]);

  const signOut = async () => {
    setAuthMessage("");
    const result = await attemptAdminLogout(logoutAdmin);
    if (!result.signedOut) {
      setAuthMessage(result.message);
      return;
    }
    setSession(null);
    setAuthState("signed-out");
  };

  if (!isCommunityConfigured) {
    return <main className="community-admin-page"><AdminHeader /><AdminSetupNotice /></main>;
  }

  if (authState === "loading" || authState === "checking") {
    return (
      <main className="community-admin-page">
        <AdminHeader />
        <p className="community-admin-auth-state"><SpinnerGap className="is-spinning" aria-hidden="true" />{t("正在核对管理员身份")}</p>
      </main>
    );
  }

  if (authState === "forbidden") {
    return (
      <main className="community-admin-page">
        <AdminHeader signedIn onSignOut={signOut} />
        <section className="community-admin-forbidden">
          <span>{t("ACCESS NOT LISTED")}</span>
          <h1>{t("账号是真的，管理员身份还没有。")}</h1>
          <p>{t("请确认本地管理员账号仍处于启用状态，并重新登录。")}</p>
          {authMessage ? <p role="alert">{t(authMessage)}</p> : null}
        </section>
      </main>
    );
  }

  if (!session) {
    return <main className="community-admin-page"><AdminHeader /><AdminLogin onAuthenticated={verifyAdmin} /></main>;
  }

  return <AdminDashboard logoutMessage={authMessage} session={session} onSignOut={signOut} />;
}
