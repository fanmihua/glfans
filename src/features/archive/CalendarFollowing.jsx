import { useState } from 'react';
import { Check, SlidersHorizontal } from '@phosphor-icons/react';
import { withBase } from '../../lib/assets.js';

export function CalendarFollowControls({ copy, onlyFollowing, setOnlyFollowing, managing, onManage, weekRange }) {
  return <div className="calendar-follow-controls">
    {weekRange && <span className="calendar-follow-range" aria-live="polite">{weekRange}</span>}
    <div className="calendar-follow-modes" role="group" aria-label={copy.filterLabel}>
      <button type="button" aria-pressed={!onlyFollowing} onClick={() => setOnlyFollowing(false)}>{copy.allSeries}</button>
      <button type="button" aria-label={copy.followingOnly} aria-pressed={onlyFollowing} onClick={() => setOnlyFollowing(true)}><span className="calendar-follow-label">{copy.followingOnly}</span><span className="calendar-follow-short" aria-hidden="true">{copy.followingShort}</span></button>
    </div>
    <button className="calendar-manage-following" type="button" aria-label={managing ? copy.done : copy.chooseSeries} aria-expanded={managing} aria-controls="calendar-follow-manager" onClick={onManage}>
      {managing ? <Check size={14} aria-hidden="true" /> : <SlidersHorizontal size={14} aria-hidden="true" />}<span className="calendar-follow-label">{managing ? copy.done : copy.chooseSeries}</span><span className="calendar-follow-short" aria-hidden="true">{managing ? copy.done : copy.chooseShort}</span>
    </button>
  </div>;
}

export function CalendarFollowManager({ copy, series, seriesIds, toggleSeries, titleFor, imageFor, saveFailed }) {
  const [query, setQuery] = useState('');
  const search = query.trim().toLocaleLowerCase();
  const matching = series.filter((item) => [titleFor(item.id), item.name, item.searchText, item.year].filter(Boolean).join(' ').toLocaleLowerCase().includes(search));
  const years = [...new Set(matching.map((item) => item.year))].sort((a, b) => {
    if (!a) return b ? 1 : 0;
    if (!b) return -1;
    return String(b).localeCompare(String(a));
  });
  return <section className="calendar-follow-manager" id="calendar-follow-manager" aria-label={copy.chooseSeries}>
    <p className="calendar-follow-hint">{copy.followHint}</p>
    <label className="calendar-follow-search"><span className="calendar-sr-only">{copy.searchSeries}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchSeries} /></label>
    {!matching.length && <p className="calendar-follow-hint" role="status">{copy.noSearchResults}</p>}
    {years.map((year) => <section className="calendar-follow-year" key={year || 'undated'} aria-label={year ? String(year) : copy.tba}>
      <h3>{year || copy.tba}</h3>
      <div className="calendar-follow-list">
      {matching.filter((item) => item.year === year).map(({ id }) => <label className="calendar-follow-option" key={id}>
        <input type="checkbox" checked={seriesIds.includes(id)} onChange={() => toggleSeries(id)} />
        {imageFor(id) && <img src={withBase(imageFor(id))} alt="" loading="lazy" />}
        <span>{titleFor(id)}</span>
      </label>)}
      </div>
    </section>)}
    {saveFailed && <p className="calendar-follow-hint" role="status">{copy.followSaveFailed}</p>}
  </section>;
}
