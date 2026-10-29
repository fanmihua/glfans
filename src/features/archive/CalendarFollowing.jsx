import { useState } from 'react';
import { Check, SlidersHorizontal, CaretDown } from '@phosphor-icons/react';
import { withBase } from '../../lib/assets.js';
import { SearchField } from '../../components/SearchField.jsx';
import { sortCalendarSeriesByPremiere } from './calendar-series-order.js';

export function CalendarFollowControls({ copy, onlyFollowing, setOnlyFollowing, managing, onManage, weekRange, showManage = true }) {
  return <div className="calendar-follow-controls">
    {weekRange && <span className="calendar-follow-range" aria-live="polite">{weekRange}</span>}
    <div className="calendar-follow-modes" role="group" aria-label={copy.filterLabel}>
      <button type="button" aria-pressed={!onlyFollowing} onClick={() => setOnlyFollowing(false)}>{copy.allSeries}</button>
      <button type="button" aria-label={copy.followingOnly} aria-pressed={onlyFollowing} onClick={() => setOnlyFollowing(true)}><span className="calendar-follow-label">{copy.followingOnly}</span><span className="calendar-follow-short" aria-hidden="true">{copy.followingShort}</span></button>
    </div>
    {showManage && <button className="calendar-manage-following" type="button" aria-label={managing ? copy.done : copy.chooseSeries} aria-expanded={managing} aria-controls="calendar-follow-manager" onClick={onManage}>
      {managing ? <Check size={14} aria-hidden="true" /> : <SlidersHorizontal size={14} aria-hidden="true" />}<span className="calendar-follow-label">{managing ? copy.done : copy.chooseSeries}</span><span className="calendar-follow-short" aria-hidden="true">{managing ? copy.done : copy.chooseShort}</span>
    </button>}
  </div>;
}

export function CalendarFollowManager({ copy, series, seriesIds, toggleSeries, titleFor, imageFor, saveFailed, subscription = false, onClear }) {
  const [query, setQuery] = useState('');
  const [collapsedYears, setCollapsedYears] = useState([]);
  const search = query.trim().toLocaleLowerCase();
  const matching = sortCalendarSeriesByPremiere(series.filter((item) => [titleFor(item.id), item.name, item.searchText, item.year].filter(Boolean).join(' ').toLocaleLowerCase().includes(search)));
  const years = [...new Set(matching.map((item) => item.year))].sort((a, b) => {
    if (!a) return b ? 1 : 0;
    if (!b) return -1;
    return String(b).localeCompare(String(a));
  });
  return <section className="calendar-follow-manager" id={subscription ? 'calendar-subscription-manager' : 'calendar-follow-manager'} aria-label={copy.chooseSeries}>
    {!subscription && <p className="calendar-follow-hint">{copy.followHint}</p>}
    <div className="calendar-follow-search-row"><SearchField className="calendar-follow-search" value={query} onChange={value => { setQuery(value); setCollapsedYears([]); }} label={copy.searchSeries} clearLabel={copy.clearSearch} />
      {subscription && <button type="button" className="calendar-subscription-clear" onClick={onClear} disabled={!seriesIds.length}>{copy.subscriptionClear}</button>}
    </div>
    <div className="calendar-follow-groups">
    {!matching.length && <p className="calendar-follow-hint" role="status">{copy.noSearchResults}</p>}
    {years.map((year) => <section className="calendar-follow-year" key={year || 'undated'} aria-label={year ? String(year) : copy.tba}>
      <h3><button type="button" className="calendar-follow-year-toggle" aria-expanded={!collapsedYears.includes(year)} aria-controls={`calendar-${subscription ? 'subscription' : 'following'}-year-${year || 'undated'}`} onClick={() => setCollapsedYears(current => current.includes(year) ? current.filter(value => value !== year) : [...current, year])}>{year || copy.tba}<CaretDown size={16} aria-hidden="true" /></button></h3>
      <div className="calendar-follow-list" id={`calendar-${subscription ? 'subscription' : 'following'}-year-${year || 'undated'}`} hidden={collapsedYears.includes(year)}>
      {matching.filter((item) => item.year === year).map(({ id }) => <label className="calendar-follow-option" key={id}>
        <input type="checkbox" checked={seriesIds.includes(id)} onChange={() => toggleSeries(id)} />
        {imageFor(id) && <img src={withBase(imageFor(id))} alt="" loading="lazy" />}
        <span>{titleFor(id)}</span>
      </label>)}
      </div>
    </section>)}
    </div>
    {saveFailed && <p className="calendar-follow-hint" role="status">{copy.followSaveFailed}</p>}
  </section>;
}
