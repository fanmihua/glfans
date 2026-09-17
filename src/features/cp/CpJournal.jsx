import { useState } from 'react';
import { ArrowRight, ArrowUpRight, CaretDown, MusicNote, Play } from '@phosphor-icons/react';
import { withBase } from '../../lib/assets.js';
import { cpJournalCopy } from './cp-journal-copy.js';
import { CpImage } from './CpImage.jsx';
import './cp-journal.css';

const external = { target: '_blank', rel: 'noopener noreferrer' };
export function jumpToJournal(id) {
  const target = document.getElementById(id);
  target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  target?.focus({ preventScroll: true });
}

export function CpNotice({ notice, locale }) {
  const copy = cpJournalCopy[locale];
  return <article className="cp-notice" id="cp-conclusion" tabIndex={-1}>
    <div className="cp-notice-kicker"><span>CHAPTER CLOSED</span><time dateTime={notice.date}>{notice.date.replace(/-/g, '.')}</time></div>
    <h3>{copy.conclusion}</h3><p className="cp-notice-epilogue">{copy.conclusionNote}</p>
    <div className="cp-notice-summary"><span>{copy.noticeSummary} · {notice.publisher}</span><p>{notice.summary[locale]}</p></div>
    <details className="cp-notice-original"><summary><span className="cp-notice-open-label">{copy.openNotice}</span><span className="cp-notice-close-label">{copy.closeNotice}</span><CaretDown size={18} /></summary>
      <div className="cp-notice-images">{notice.images.map(item => <figure key={item.language}>
        <figcaption>{item.language === 'th' ? copy.originalTh : copy.originalEn}</figcaption>
        <a href={withBase(item.image)} {...external} aria-label={`${notice.publisher} · ${copy.noticeImage} · ${item.language}`}><img src={withBase(item.image)} alt={`${notice.publisher} · ${copy.noticeImage} · ${item.language}`} loading="lazy" /></a>
      </figure>)}</div>
    </details>
    <a className="cp-journal-link" href={notice.source} {...external}>{copy.officialPost}<ArrowUpRight size={16} /></a>
    <p className="cp-journal-note">{copy.noticeNote}</p>
  </article>;
}

export function CpTimeline({ cp, events, archiveById, locale }) {
  const copy = cpJournalCopy[locale];
  const [expanded, setExpanded] = useState(false);
  const limit = Math.max(6, events.findIndex(event => event.kind === 'conclusion') + 1);
  const visible = expanded ? events : events.slice(0, limit);
  return <section className="cp-journal cp-timeline" id="cp-timeline" tabIndex={-1} aria-labelledby="cp-timeline-title">
    <div className="cp-section-heading"><h2 id="cp-timeline-title">{copy.timeline}</h2><span>TIMELINE</span></div>
    <p className="cp-journal-intro">{copy.timelineNote}</p>
    <div className="cp-timeline-legend">{cp.names.map((name, index) => <span key={name} className={`cp-lane-label cp-lane-label--${index}`}><i aria-hidden="true" />{name}</span>)}</div>
    <ol className="cp-timeline-events" id="cp-timeline-list">{visible.map(event => {
      const work = archiveById.get(event.workId);
      const isConclusion = event.kind === 'conclusion';
      return <li key={event.id} className={`cp-timeline-event cp-timeline-event--${event.lane}${isConclusion ? ' cp-timeline-event--ended' : ''}${event.kind === 'pairAnnouncement' ? ' cp-timeline-event--meeting' : ''}`}>
        <span className="cp-track-bridge" aria-hidden="true" />
        {isConclusion ? <CpNotice notice={event} locale={locale} /> : <article className="cp-milestone">
          <div className="cp-milestone-meta">{event.date && <time dateTime={event.date}>{event.date.replace(/-/g, '.')}</time>}<span>{copy[event.kind]}</span></div>
          {event.lane !== 'joint' && <p className={`cp-lane-label cp-lane-label--${event.lane}`}><i aria-hidden="true" />{cp.names[event.lane]}</p>}
          <h3>{event.title}</h3>
          {event.description && <p>{event.description[locale]}</p>}
          {event.performers && <p>{event.performers.join(' & ')}</p>}
          {event.sectionId ? <button type="button" className="cp-journal-radio" onClick={() => jumpToJournal(event.sectionId)}>{copy.details}<ArrowRight size={16} /></button> : work ? <a className="cp-journal-link" href={`#/archive/${work.year}/${work.id}`}>{copy.archive}<ArrowRight size={16} /></a>
            : <a className="cp-journal-link" href={event.url || event.source} {...external}>{copy.details}<ArrowUpRight size={16} /></a>}
        </article>}
      </li>;
    })}</ol>
    {events.length > limit && <button type="button" className="cp-journal-more" aria-expanded={expanded} aria-controls="cp-timeline-list" onClick={() => { if (expanded) jumpToJournal('cp-timeline'); setExpanded(!expanded); }}>{expanded ? copy.less : `${copy.more} · ${events.length}`}<CaretDown size={16} /></button>}
    <p className="cp-journal-note">{copy.timelineScope}</p>
  </section>;
}

export function CpMediaSection({ items, category, archiveById, locale }) {
  const copy = cpJournalCopy[locale];
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return null;
  return <section className="cp-journal cp-media-section" id={`cp-${category}`} tabIndex={-1} aria-labelledby={`cp-${category}-title`}>
    <div className="cp-section-heading"><h2 id={`cp-${category}-title`}>{copy[category]}</h2><span>{category === 'music' ? 'ON REPEAT' : 'IN FRAME'}</span></div>
    <p className="cp-journal-intro">{copy[`${category}Note`]}</p>
    <div className="cp-media-grid" id={`cp-${category}-list`}>{(expanded ? items : items.slice(0, 3)).map(item => {
      const work = archiveById.get(item.workId);
      return <article className="cp-media-card" key={item.id} data-media-id={item.id}>
        <a href={item.url} {...external} className={`cp-media-cover${item.square ? ' cp-media-cover--square' : ''}`} aria-label={`${item.title} · ${item.kind === 'single' ? copy.listen : copy.watch}`}>
          <CpImage src={item.image} alt={item.title} width={item.square ? 1200 : 1280} height={item.square ? 1200 : 720} loading="lazy" />
          <span className="cp-media-play" aria-hidden="true">{item.kind === 'single' ? <MusicNote size={20} /> : <Play size={20} weight="fill" />}</span>
        </a>
        <div className="cp-media-meta"><span>{copy[item.scope]}</span><span>{copy[item.kind]}{work && category === 'music' && ' · OST'}</span></div>
        <h3><a href={item.url} {...external}>{item.title}<ArrowUpRight size={16} /></a></h3>
        <p className="cp-media-credits">{item.performers.join(' & ')}</p>
        <p className="cp-media-publisher">{item.publisher}</p>
        {work && <a className="cp-journal-link" href={`#/archive/${work.year}/${work.id}`}>{work.titleEn}<ArrowRight size={16} /></a>}
      </article>;
    })}</div>
    {items.length > 3 && <button type="button" className="cp-journal-more" aria-expanded={expanded} aria-controls={`cp-${category}-list`} onClick={() => { if (expanded) jumpToJournal(`cp-${category}`); setExpanded(!expanded); }}>{expanded ? copy.less : `${copy.more} · ${items.length}`}<CaretDown size={16} /></button>}
    <p className="cp-journal-note">{copy.platformNote}</p>
  </section>;
}
