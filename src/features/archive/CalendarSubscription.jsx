import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CalendarPlus, Check, Copy } from '@phosphor-icons/react';
import { CalendarFollowManager } from './CalendarFollowing.jsx';
import { appleSubscriptionBrowser, calendarSubscriptionLinks, initialCalendarSubscription } from './calendar-subscription.js';

export function CalendarSubscription({ scopeIds, followedIds, ...props }) {
  const { series } = props;
  const [selection, setSelection] = useState(() => initialCalendarSubscription(scopeIds, followedIds, series.map(item => item.id)));
  return <CalendarSubscriptionPanel {...props} selection={selection} setSelection={setSelection} />;
}

export function CalendarSubscriptionPanel({ copy, locale, series, selection, setSelection, titleFor, imageFor, onBack }) {
  const [copyResult, setCopyResult] = useState(null);
  const headingRef = useRef(null), linkRef = useRef(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);
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
      linkRef.current?.focus();
      linkRef.current?.select();
    }
  };
  return <section className="calendar-subscription" id="calendar-subscription" aria-labelledby="calendar-subscription-title">
    <div className="calendar-subscription-heading"><button type="button" className="calendar-subscription-back" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" />{copy.subscriptionBack}</button>
      <h3 ref={headingRef} id="calendar-subscription-title" tabIndex={-1}>{copy.subscriptionTitle}</h3></div>
    <p className="calendar-subscription-intro">{copy.subscriptionIntro}</p>
    <div className="calendar-subscription-modes" role="group" aria-label={copy.subscriptionScope}>
      <button type="button" aria-pressed={selection.mode === 'all'} onClick={() => setSelection(current => ({ ...current, mode: 'all' }))}>{copy.subscriptionAll}</button>
      <button type="button" aria-pressed={selection.mode === 'selected'} onClick={() => setSelection(current => ({ ...current, mode: 'selected' }))}>{copy.subscriptionSelected}</button>
    </div>
    <p className="calendar-subscription-scope-note">{selection.mode === 'all' ? copy.subscriptionAllHint : copy.subscriptionSelectedHint}</p>
    {selection.mode === 'selected' && <div className="calendar-subscription-selection">
      <div className="calendar-subscription-selection-heading"><strong aria-live="polite">{copy.subscriptionCount.replace('{count}', selection.seriesIds.length)}</strong>
        <button type="button" onClick={() => setSelection(current => ({ ...current, seriesIds: [] }))} disabled={!selection.seriesIds.length}>{copy.subscriptionClear}</button></div>
      <CalendarFollowManager copy={{ ...copy, chooseSeries: copy.subscriptionChoose, followHint: copy.subscriptionChooseHint }} series={series} seriesIds={selection.seriesIds} toggleSeries={toggleSeries} titleFor={titleFor} imageFor={imageFor} />
    </div>}
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
    <details className="calendar-subscription-apple-help">
      <summary>{copy.subscriptionAppleHelp}</summary>
      <p>{copy.subscriptionAppleInstalled}</p>
      <ol>
        <li>{copy.subscriptionAppleCopyStep}</li>
        <li>{copy.subscriptionAppleListStep}</li>
        <li>{copy.subscriptionAppleAddStep}</li>
      </ol>
    </details>
    <label className="calendar-subscription-link"><span>{copy.subscriptionLink}</span><input ref={linkRef} type="text" value={subscriptionUrl} readOnly disabled={!links} placeholder={copy.subscriptionEmpty} aria-describedby="calendar-subscription-help" onFocus={(event) => event.target.select()} /></label>
    <p className="calendar-subscription-copy-status" role="status">{status === 'manual' ? copy.subscriptionCopyManual : status === 'copied' ? (embeddedBrowser ? copy.subscriptionSafariCopied : copy.subscriptionCopied) : !links ? copy.subscriptionEmpty : ''}</p>
    {!embeddedBrowser && <p className="calendar-subscription-help" id="calendar-subscription-help">{copy.subscriptionOther}</p>}
    <p className="calendar-subscription-help">{copy.subscriptionReplace}</p>
  </section>;
}
