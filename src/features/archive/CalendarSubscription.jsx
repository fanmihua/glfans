import { useMemo, useRef, useState } from 'react';
import { CalendarPlus, CaretDown, Check, Copy } from '@phosphor-icons/react';
import { CalendarFollowManager } from './CalendarFollowing.jsx';
import { appleSubscriptionBrowser, calendarSubscriptionLinks, initialCalendarSubscription } from './calendar-subscription.js';

export function CalendarSubscription({ scopeIds, followedIds, ...props }) {
  const { series } = props;
  const [selection, setSelection] = useState(() => initialCalendarSubscription(scopeIds, followedIds, series.map(item => item.id)));
  return <CalendarSubscriptionPanel {...props} selection={selection} setSelection={setSelection} />;
}

export function CalendarSubscriptionPanel({ copy, locale, series, selection, setSelection, titleFor, imageFor }) {
  const [copyResult, setCopyResult] = useState(null);
  const linkRef = useRef(null);
  const linkDisclosureRef = useRef(null);
  const links = useMemo(() => calendarSubscriptionLinks({ origin: window.location.origin, locale, ...selection }), [locale, selection]);
  const embeddedBrowser = useMemo(() => appleSubscriptionBrowser(window.navigator), []);
  const subscriptionUrl = links?.[embeddedBrowser ? 'webcal' : 'https'] || '';
  const status = subscriptionUrl && copyResult?.url === subscriptionUrl ? copyResult.status : null;
  const toggleSeries = (id) => setSelection(current => ({ ...current,
    seriesIds: current.seriesIds.includes(id) ? current.seriesIds.filter(value => value !== id) : [...current.seriesIds, id] }));
  const copyLink = async () => {
    if (!links) return;
    const url = subscriptionUrl;
    try {
      await navigator.clipboard.writeText(url);
      setCopyResult({ url, status: 'copied' });
    } catch {
      setCopyResult({ url, status: 'manual' });
      if (linkDisclosureRef.current) linkDisclosureRef.current.open = true;
      linkRef.current?.focus();
      linkRef.current?.select();
    }
  };
  return <section className="calendar-subscription" id="calendar-subscription" aria-label={copy.subscriptionTitle}>
    <section className="calendar-subscription-step" aria-labelledby="calendar-subscription-scope-title">
    <h3 id="calendar-subscription-scope-title"><span aria-hidden="true">01</span>{copy.subscriptionScopeTitle}</h3>
    <div className="calendar-subscription-options">
      <div className="calendar-subscription-modes" role="group" aria-label={copy.subscriptionScope}>
        <button type="button" aria-pressed={selection.mode === 'all'} onClick={() => setSelection(current => ({ ...current, mode: 'all' }))}>{copy.subscriptionAll}</button>
        <button type="button" aria-pressed={selection.mode === 'selected'} onClick={() => setSelection(current => ({ ...current, mode: 'selected' }))}>{copy.subscriptionSelected}</button>
      </div>
      {selection.mode === 'selected' && <strong className="calendar-subscription-count" aria-live="polite">{copy.subscriptionCount.replace('{count}', selection.seriesIds.length)}</strong>}
    </div>
    <p className="calendar-subscription-scope-note">{selection.mode === 'all' ? copy.subscriptionAllHint : copy.subscriptionSelectedHint}</p>
    {selection.mode === 'selected' && <div className="calendar-subscription-selection">
      <CalendarFollowManager subscription copy={{ ...copy, searchSeries: copy.subscriptionSearch, chooseSeries: copy.subscriptionChoose }} series={series} seriesIds={selection.seriesIds} toggleSeries={toggleSeries} titleFor={titleFor} imageFor={imageFor}
        onClear={() => setSelection(current => ({ ...current, seriesIds: [] }))} />
    </div>}
    </section>
    <section className="calendar-subscription-step" aria-labelledby="calendar-subscription-add-title">
    <h3 id="calendar-subscription-add-title"><span aria-hidden="true">02</span>{copy.subscriptionAddTitle}</h3>
    <div className={`calendar-subscription-actions${embeddedBrowser ? ' calendar-subscription-actions--embedded' : ''}`}>
      {embeddedBrowser ? <button type="button" className="calendar-subscription-apple" onClick={copyLink} disabled={!links}>{status === 'copied' ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}{status === 'copied' ? copy.subscriptionCopied : copy.subscriptionAppleCopy}</button>
        : <>
          {links ? <a href={links.webcal} className="calendar-subscription-apple"><CalendarPlus size={18} aria-hidden="true" />{copy.subscriptionApple}</a>
            : <button type="button" className="calendar-subscription-apple" disabled><CalendarPlus size={18} aria-hidden="true" />{copy.subscriptionApple}</button>}
          <button type="button" className="calendar-subscription-copy" onClick={copyLink} disabled={!links}>{status === 'copied' ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}{status === 'copied' ? copy.subscriptionCopied : copy.subscriptionCopy}</button>
        </>}
    </div>
    {embeddedBrowser && <div className="calendar-subscription-safari-note" id="calendar-subscription-help">
      <p>{copy.subscriptionSafariHint.replace('{browser}', embeddedBrowser === 'wechat' ? copy.subscriptionWechat : copy.subscriptionBaidu)}</p>
      <ol><li>{copy.subscriptionSafariCopyStep}</li><li>{copy.subscriptionSafariOpenStep}</li><li>{copy.subscriptionSafariConfirmStep}</li></ol>
    </div>}
    <p className="calendar-subscription-copy-status" role="status">{status === 'manual' ? copy.subscriptionCopyManual : status === 'copied' ? (embeddedBrowser ? copy.subscriptionSafariCopied : copy.subscriptionCopied) : !links ? copy.subscriptionEmpty : ''}</p>
    <details className="calendar-subscription-link-disclosure" ref={linkDisclosureRef}>
    <summary>{copy.subscriptionViewLink}<CaretDown size={14} aria-hidden="true" /></summary>
    <label className="calendar-subscription-link"><span>{copy.subscriptionLink}</span><input ref={linkRef} type="text" value={subscriptionUrl} readOnly disabled={!links} placeholder={copy.subscriptionEmpty} aria-describedby="calendar-subscription-help" onFocus={(event) => event.target.select()} /></label>
    {!embeddedBrowser && <p className="calendar-subscription-help" id="calendar-subscription-help">{copy.subscriptionOther}</p>}
    </details>
    {selection.mode === 'selected' && <p className="calendar-subscription-help">{copy.subscriptionReplace}</p>}
    </section>
  </section>;
}
