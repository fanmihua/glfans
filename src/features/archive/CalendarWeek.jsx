import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { observeElementResize } from '../../lib/browser-compat.js';
import { moveDate, weekStart } from './calendar-model.js';

export function CalendarWeek({ selected, onSelect, today, eventsByDate, copy, titleFor, episodeFor, timeFor, renderDetails }) {
  const trackRef = useRef(null);
  const [expanded, setExpanded] = useState(null);
  const start = weekStart(selected);
  useEffect(() => setExpanded(null), [start]);
  useLayoutEffect(() => {
    const track = trackRef.current;
    let timer;
    const center = () => track.scrollTo({ left: track.clientWidth, behavior: 'instant' });
    const settle = () => {
      clearTimeout(timer);
      if (!track.clientWidth) return;
      const direction = Math.round(track.scrollLeft / track.clientWidth) - 1;
      if (direction) onSelect((date) => moveDate(date, direction * 7));
    };
    const scroll = () => { clearTimeout(timer); timer = setTimeout(settle, 180); };
    center();
    let width = track.clientWidth;
    const handleResize = () => {
      if (track.clientWidth !== width) { width = track.clientWidth; center(); }
    };
    const observer = observeElementResize(track, handleResize);
    if (!observer) window.addEventListener('resize', handleResize);
    track.addEventListener('scroll', scroll, { passive: true });
    track.addEventListener('scrollend', settle);
    return () => {
      clearTimeout(timer);
      observer?.disconnect();
      if (!observer) window.removeEventListener('resize', handleResize);
      track.removeEventListener('scroll', scroll);
      track.removeEventListener('scrollend', settle);
    };
  }, [start, onSelect]);

  return <section className="calendar-week-browser" aria-label={copy.weekView}>
    <div className="calendar-week-track" ref={trackRef} tabIndex={0} aria-label={copy.swipeWeek}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        onSelect((date) => moveDate(date, event.key === 'ArrowLeft' ? -7 : 7));
      }}>
      {[-1, 0, 1].map((offset) => {
        const first = moveDate(start, offset * 7);
        return <div className="calendar-week-page" key={first} aria-hidden={offset !== 0 ? true : undefined}>
          {Array.from({ length: 7 }, (_, index) => {
            const date = moveDate(first, index);
            const entries = eventsByDate.get(date) || [];
            return <div key={date}
              className={`calendar-week-day${date === today ? ' is-today' : ''}`}
              aria-current={date === today ? 'date' : undefined}>
              <span className="calendar-week-date"><span>{copy.weekdays[index]}</span><strong>{Number(date.slice(-2))}</strong></span>
              <div className="calendar-week-entries">{entries.length ? entries.map((event) => {
                const open = offset === 0 && expanded === event.id;
                const detailId = `week-detail-${first}-${event.id}`;
                return <div className="calendar-week-entry" key={event.id}>
                  <button type="button" tabIndex={offset === 0 ? 0 : -1} className="calendar-week-entry-toggle"
                    aria-expanded={open} aria-controls={detailId}
                    onClick={() => { onSelect(date); setExpanded(open ? null : event.id); }}>
                    <strong>{titleFor(event.seriesId)}</strong><CaretDown size={15} aria-hidden="true" />
                    <span><b>{episodeFor(event)}</b><time>{timeFor(event)}</time></span>
                  </button>
                  <div id={detailId} hidden={!open} className="calendar-week-entry-details">{open && renderDetails(event)}</div>
                </div>;
              }) : <span className="calendar-week-empty">{copy.noEntries}</span>}</div>
            </div>;
          })}
        </div>;
      })}
    </div>
  </section>;
}
