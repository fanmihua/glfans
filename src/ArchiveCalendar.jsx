import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowUpRight, CaretLeft, CaretRight, CaretDown, CalendarBlank } from '@phosphor-icons/react';
import { getLocale, getDateLocale, t, requireCatalog } from './i18n/runtime.js';
import { CpRelatedLinks } from './features/cp/CpRelatedLinks.jsx';
import { cpCopy } from './features/cp/cp-copy.js';
import { scopeStartDate } from './features/archive/calendar-scope.js';
import { seriesName } from './i18n/proper-names.js';
import { useMobileLayout } from './hooks/useMobileLayout.js';
import { withBase } from './lib/assets.js';
import { archiveDramas } from './data/archive-dramas.js';
import currentSchedule from './data/archive-schedule.json';
import history from './data/archive-history.json';
import { mergeCalendarData } from './features/archive/calendar-data.js';
import { CalendarPeriodPicker } from './features/archive/CalendarPeriodPicker.jsx';
import { calendarCopy } from './features/archive/calendar-copy.js';
import { CalendarFollowControls, CalendarFollowManager } from './features/archive/CalendarFollowing.jsx';
import { useCalendarFollowing } from './features/archive/useCalendarFollowing.js';
import { CalendarWeek } from './features/archive/CalendarWeek.jsx';
import { calendarDate, calendarMonthAvailability, eventDate, eventStatus, monthDates, moveDate, weekStart } from './features/archive/calendar-model.js';
import './archive-calendar.css';

const schedule = mergeCalendarData(history, currentSchedule);
const archiveById = new Map(archiveDramas.map((item) => [item.id, item]));
const confirmedSeriesIds = new Set(schedule.events.filter((event) => !event.needsReview).map((event) => event.seriesId));
const followableSeries = schedule.series.filter((series) => confirmedSeriesIds.has(series.id)).map((series) => {
  const archive = archiveById.get(series.id);
  return { ...series, year: archive?.year || series.premiereDate?.slice(0, 4),
    searchText: [archive?.title, archive?.titleEn, ...(archive?.cast || []).map((person) => typeof person === 'string' ? person : Object.values(person).join(' '))].join(' ') };
});
const sourcesById = new Map(schedule.series.map((item) => [item.id, item]));

export function ArchiveCalendar({ onClose, returnFocus, initialSeriesIds, scopeLabel }) {
  requireCatalog('archive');
  const locale = getLocale(), copy = calendarCopy[locale];
  const cpText = cpCopy[locale];
  const [scopeIds, setScopeIds] = useState(() => initialSeriesIds?.length ? new Set(initialSeriesIds) : null);
  const [showAllOverride, setShowAllOverride] = useState(false);
  const mobile = useMobileLayout();
  const dialogRef = useRef(null);
  const following = useCalendarFollowing();
  const onlyFollowing = !scopeIds && !showAllOverride && following.onlyFollowing;
  const [managingFollowing, setManagingFollowing] = useState(false);
  const [choosingPeriod, setChoosingPeriod] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const periodRef = useRef(null);
  useLayoutEffect(() => {
    if (managingFollowing || choosingPeriod) dialogRef.current?.querySelector('.calendar-scroll')?.scrollTo({ top: 0, behavior: 'instant' });
  }, [managingFollowing, choosingPeriod]);
  const followedIds = useMemo(() => new Set(following.seriesIds), [following.seriesIds]);
  const noFollowedSeries = !followableSeries.some(({ id }) => followedIds.has(id));
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const focus = returnFocus || document.activeElement;
    const rootOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.querySelector('#calendar-dialog-title')?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.documentElement.style.overflow = rootOverflow;
      document.body.style.overflow = bodyOverflow;
      if (focus?.isConnected) focus.focus({ preventScroll: true });
    };
  }, [returnFocus]);
  const zone = locale === 'zh' ? 'Asia/Shanghai' : 'Asia/Bangkok';
  const [now, setNow] = useState(Date.now);
  const today = calendarDate(now, zone);
  const [selected, setSelected] = useState(() => scopeStartDate(schedule.events, initialSeriesIds, calendarDate(Date.now(), zone), zone));
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const eventsByDate = useMemo(() => {
    const result = new Map();
    for (const event of schedule.events) {
      if (event.needsReview || (scopeIds && !scopeIds.has(event.seriesId)) || (onlyFollowing && !followedIds.has(event.seriesId))) continue;
      const date = eventDate(event, zone);
      result.set(date, [...(result.get(date) || []), event]);
    }
    return result;
  }, [zone, onlyFollowing, followedIds, scopeIds]);
  const monthAvailability = useMemo(() => calendarMonthAvailability(eventsByDate), [eventsByDate]);
  const calendarYears = [...new Set([...archiveDramas.map((item) => Number(item.year)), Number(today.slice(0, 4)), Number(selected.slice(0, 4)),
    ...schedule.events.map((event) => Number(event.date.slice(0, 4)))])].sort((a, b) => a - b);
  const dates = monthDates(selected);
  const dayEvents = eventsByDate.get(selected) || [];
  const covered = schedule.coverage.some((range) => range.from <= selected && selected <= range.to);
  const format = (date, options) => new Intl.DateTimeFormat(getDateLocale(), { timeZone: 'UTC', ...options }).format(new Date(`${date}T12:00:00Z`));
  const titleFor = (id) => archiveById.has(id) ? seriesName(archiveById.get(id), locale) : sourcesById.get(id)?.name || id;
  const episodeFor = (event) => event.episode ? (locale === 'zh' ? `第 ${event.episode} 集` : locale === 'th' ? `ตอนที่ ${event.episode}` : `EP. ${String(event.episode).padStart(2, '0')}`) : copy.premiere;
  const timeFor = (event) => event.airsAt ? new Intl.DateTimeFormat(getDateLocale(), { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(event.airsAt)) : eventStatus(event, now) === 'aired' ? copy.timeUnrecorded : copy.timeUnknown;
  const navigateMonth = (direction) => {
    const date = new Date(`${selected.slice(0, 7)}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + direction);
    setSelected(date.toISOString().slice(0, 10));
    setChoosingPeriod(false);
  };
  const provenance = <><p>{copy.notice}</p><p><a href="https://glspotlight.com/airing" target="_blank" rel="noreferrer">{copy.sourceName}</a><a href="https://www.tvmaze.com" target="_blank" rel="noreferrer">TVmaze</a><span>{copy.checked}：{new Intl.DateTimeFormat(getDateLocale(), { timeZone: zone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(schedule.checkedAt))}</span><span>{copy.historyChecked}：{format(schedule.historyCheckedAt.slice(0, 10), { year: 'numeric', month: 'short', day: 'numeric' })}</span></p>{now - Date.parse(schedule.checkedAt) > 8 * 86400000 && <strong>{copy.stale}</strong>}</>;
  const mobileDetails = (event) => {
    const series = sourcesById.get(event.seriesId), archive = archiveById.get(event.seriesId);
    return <>
      <div className="calendar-week-detail-header">
        {archive?.image && <img className="calendar-week-poster" src={withBase(archive.image)} alt={titleFor(event.seriesId)} loading="lazy" />}
        <div><span className="calendar-week-status">{copy[eventStatus(event, now)]}</span>
          {(event.network || series?.network) && <p className="calendar-week-facts">{copy.network} · {event.network || series.network}</p>}
          {!!series?.platforms.length && <p className="calendar-week-facts">{copy.availability} · {series.platforms.join(' / ')}</p>}
        </div>
      </div>
      {archive?.summary && <p>{t(archive.summary)}</p>}
      <a href={event.sourceUrl} target="_blank" rel="noreferrer">{copy.more}<ArrowUpRight size={14} /></a>
      {archive && <a href={`#/archive/${archive.year}/${archive.id}`} onClick={onClose}>{cpText.archive}<ArrowUpRight size={14} /></a>}
      <CpRelatedLinks seriesId={event.seriesId} onNavigate={onClose} />
    </>;
  };
  const toolbar = (
    <div className="calendar-toolbar">
        <div className="calendar-period"><button onClick={() => navigateMonth(-1)} aria-label={copy.previous}><CaretLeft size={20} /></button><h2><button className="calendar-period-title" ref={periodRef} aria-label={`${format(selected, { year: 'numeric', month: 'long' })} · ${copy.chooseMonth}`} aria-expanded={choosingPeriod} onClick={() => {
          setPickerYear(Number(selected.slice(0, 4))); setChoosingPeriod((value) => !value); setManagingFollowing(false);
        }}>{format(selected, { year: 'numeric', month: mobile && locale !== 'zh' ? 'short' : 'long' })}<CaretDown size={12} aria-hidden="true" /></button></h2><button onClick={() => navigateMonth(1)} aria-label={copy.next}><CaretRight size={20} /></button><button className="calendar-today" onClick={() => { setSelected(today); setChoosingPeriod(false); }}>{copy.today}</button></div>
        {locale === 'en' && <span className="calendar-timezone-note">Thailand time · UTC+7</span>}
      </div>
  );
  const firstDay = weekStart(selected);
  const followControls = scopeIds ? <div className="calendar-scope"><span>{cpText.scope} · {scopeLabel}</span><button type="button" onClick={() => { setScopeIds(null); setShowAllOverride(true); }}>{cpText.allSeries}</button>{mobile && <small>{format(firstDay, { month: 'short', day: 'numeric' })} — {format(moveDate(firstDay, 6), { month: 'short', day: 'numeric' })}</small>}</div> : <CalendarFollowControls copy={copy} onlyFollowing={onlyFollowing} setOnlyFollowing={value => { setShowAllOverride(false); following.setOnlyFollowing(value); }}
    managing={managingFollowing} onManage={() => {
      setChoosingPeriod(false);
      if (managingFollowing) { setShowAllOverride(false); following.setOnlyFollowing(true); }
      setManagingFollowing((value) => !value);
    }}
    weekRange={mobile && !managingFollowing && !choosingPeriod ? `${format(firstDay, { month: 'short', day: 'numeric' })} — ${format(moveDate(firstDay, 6), { month: 'short', day: 'numeric' })}` : null} />;
  return createPortal(<dialog className="calendar-dialog" ref={dialogRef} aria-labelledby="calendar-dialog-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="calendar-panel">
      <header className="calendar-dialog-header"><h2 id="calendar-dialog-title" tabIndex={-1} autoFocus>{copy.title}</h2><button className="calendar-close" aria-label={copy.close} onClick={onClose}><X size={20} /></button></header>
      {mobile && <div className="calendar-content calendar-mobile-navigation">
        {toolbar}
        {followControls}
      </div>}
      <div className="calendar-scroll">
    <div className="calendar-content">
      {!mobile && <>{toolbar}{followControls}</>}
      {choosingPeriod ? <CalendarPeriodPicker selected={selected} year={pickerYear} years={calendarYears} onYearChange={setPickerYear} copy={copy} format={format} availability={monthAvailability}
        onSelect={(date) => { setSelected(date); setChoosingPeriod(false); requestAnimationFrame(() => periodRef.current?.focus({ preventScroll: true })); }} />
        : managingFollowing ? <CalendarFollowManager copy={copy} series={followableSeries} seriesIds={following.seriesIds} toggleSeries={following.toggleSeries}
        titleFor={titleFor} imageFor={(id) => archiveById.get(id)?.image} saveFailed={following.saveFailed} />
        : onlyFollowing && noFollowedSeries ? <div className="calendar-follow-empty" role="status"><p>{copy.noFollowing}</p><button type="button" onClick={() => setManagingFollowing(true)}>{copy.chooseSeries}</button></div>
        : <div className="calendar-layout">
        {mobile ? <CalendarWeek selected={selected} onSelect={setSelected} today={today} eventsByDate={eventsByDate}
          copy={onlyFollowing ? { ...copy, noEntries: copy.noFollowingEntries } : copy} titleFor={titleFor} episodeFor={episodeFor} timeFor={timeFor} renderDetails={mobileDetails} /> : <section className="calendar-grid" aria-label={copy.selectDate}>
          {copy.weekdays.map((name, index) => <span className="calendar-weekday" key={index}>{name}</span>)}
          {dates.map((date) => {
            const entries = eventsByDate.get(date) || [];
            return <button key={date} className={`calendar-date${date === selected ? ' is-selected' : ''}${date === today ? ' is-today' : ''}${date.slice(0, 7) !== selected.slice(0, 7) ? ' is-outside' : ''}`}
              aria-pressed={date === selected} aria-current={date === today ? 'date' : undefined} aria-label={`${date} · ${entries.length} ${copy.count}`} onClick={() => setSelected(date)}>
              <span className="calendar-date-number">{Number(date.slice(-2))}</span>
              <span className="calendar-date-titles">{entries.map((event) => <span key={event.id}>
                <span className="calendar-date-series">{titleFor(event.seriesId)}</span>
                <span className="calendar-date-episode">{episodeFor(event)}</span>
                <span className="calendar-date-time">{timeFor(event)}</span>
              </span>)}</span>
              {entries.length > 0 && <span className="calendar-date-dot" aria-hidden="true" />}
            </button>;
          })}
        </section>}
        {!mobile && <section className="calendar-agenda" aria-label={copy.day} aria-live="polite">
          <header><span>{format(selected, { month: 'short', day: 'numeric', weekday: 'long' })}</span><b>{dayEvents.length} {copy.count}</b></header>
          {dayEvents.length ? dayEvents.map((event) => {
            const series = sourcesById.get(event.seriesId), archive = archiveById.get(event.seriesId);
            const status = eventStatus(event, now);
            return <article className="calendar-program" key={event.id}>
              <div className="calendar-program-time"><strong>{event.airsAt ? new Intl.DateTimeFormat(getDateLocale(), { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(event.airsAt)) : '—'}</strong><span className={event.needsReview ? 'needs-review' : ''}>{copy[status]}</span></div>
              <div className="calendar-program-body">
                {archive?.image && <img src={withBase(archive.image)} alt="" loading="lazy" />}
                <div><span className="calendar-episode">{episodeFor(event)}</span><h3>{titleFor(event.seriesId)}</h3>
                  {(event.network || series?.network) && <p>{copy.network} · {event.network || series.network}</p>}
                  {!!series?.platforms.length && <p>{copy.availability} · {series.platforms.join(' / ')}</p>}

                </div>
              </div>
              {archive?.summary && <p className="calendar-program-summary">{t(archive.summary)}</p>}
              <div className="calendar-program-links"><a href={event.sourceUrl} target="_blank" rel="noreferrer">{copy.more}<ArrowUpRight size={14} /></a></div>
              {archive && <div className="calendar-program-links"><a href={`#/archive/${archive.year}/${archive.id}`} onClick={onClose}>{cpText.archive}<ArrowUpRight size={14} /></a></div>}
              <CpRelatedLinks seriesId={event.seriesId} onNavigate={onClose} />
            </article>;
          }) : <div className="calendar-empty"><CalendarBlank size={36} weight="light" /><h3>{onlyFollowing ? copy.noFollowingEntries : covered ? copy.empty : copy.emptyOutside}</h3><p>{onlyFollowing ? copy.followingEmptyNote : copy.emptyNote}</p></div>}
        </section>}
      </div>}
      {!managingFollowing && !choosingPeriod && (mobile ? <details className="calendar-provenance calendar-provenance-disclosure"><summary>{copy.notes}</summary>{provenance}</details> : <aside className="calendar-provenance">{provenance}</aside>)}
    </div>
      </div>
    </div>
  </dialog>, document.body);
}
