import { CalendarBlank, CalendarCheck, DownloadSimple } from '@phosphor-icons/react';
import { withBase } from '../../lib/assets.js';
import { calendarGuideCopy, calendarGuideHelp } from './calendar-guide-copy.js';
import './calendar-guide.css';

const Steps = ({ items }) => <ol className="calendar-guide-steps">{items.map((item, index) => <li key={index}>{item}</li>)}</ol>;
const subscriptionImages = ['choose-zh', 'open-ios', 'added-ios'];
const importIcons = [CalendarBlank, DownloadSimple, CalendarCheck];

export function CalendarGuide({ locale, mode, onModeChange }) {
  const copy = calendarGuideCopy[locale] || calendarGuideCopy.zh;
  const help = calendarGuideHelp(locale);
  const importing = mode === 'import';
  const cards = importing ? copy.importCards : copy.subscribeCards;
  const helpKeys = importing ? ['appleMacImport', 'googleHelp'] : ['appleIphone', 'appleMacSubscribe'];
  const selectMode = (next) => onModeChange(next);
  const handleTabKey = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'subscribe' : event.key === 'End' ? 'import' : importing ? 'subscribe' : 'import';
    selectMode(next);
    event.currentTarget.parentElement.querySelector(`#calendar-guide-tab-${next}`)?.focus();
  };
  return <section className="calendar-guide" aria-label={copy.title}>
    <div className="calendar-guide-topline">
      <div className="calendar-guide-modes" role="tablist" aria-label={copy.modes}>
        <button type="button" role="tab" id="calendar-guide-tab-subscribe" aria-selected={!importing} aria-controls="calendar-guide-content" tabIndex={importing ? -1 : 0} onKeyDown={handleTabKey} onClick={() => selectMode('subscribe')}>{copy.subscribe}</button>
        <button type="button" role="tab" id="calendar-guide-tab-import" aria-selected={importing} aria-controls="calendar-guide-content" tabIndex={importing ? 0 : -1} onKeyDown={handleTabKey} onClick={() => selectMode('import')}>{copy.import}</button>
      </div>
      <p className="calendar-guide-intro">{copy.subscribeIntro}</p>
    </div>
    <div className="calendar-guide-content" id="calendar-guide-content" role="tabpanel" aria-labelledby={`calendar-guide-tab-${importing ? 'import' : 'subscribe'}`}>
      <ol className="calendar-guide-cards" role="list">
        {cards.map((card, index) => {
          const Icon = importIcons[index];
          return <li key={index}>
            <div className={`calendar-guide-picture calendar-guide-picture--${importing ? 'import' : subscriptionImages[index]}`} aria-hidden="true">
              {importing ? <Icon size={58} weight="duotone" /> : <img src={withBase(`/assets/calendar-guide/${(index === 0 ? `choose-${locale}` : subscriptionImages[index])}.webp`)} alt="" loading="lazy" />}
            </div>
            <div className="calendar-guide-card-text"><h4><span>{index + 1}</span>{card.title}</h4><p>{card.body}</p></div>
          </li>;
        })}
      </ol>
      <details key={mode} className="calendar-guide-details calendar-guide-more">
        <summary>{copy.moreHelp}</summary>
        <p className="calendar-guide-note">{importing ? copy.importShortHint : copy.embeddedShort}</p>
        {importing ? <>
          <p>{copy.exportScope}</p>
          <h4>{copy.macImport}</h4><Steps items={copy.macImportSteps} />
          <h4>{copy.googleImport}</h4><Steps items={copy.googleImportSteps} />
          <p>{copy.iphoneImport}</p><p>{copy.downloadNote}</p>
        </> : <>
          <h4>{copy.iphone}</h4><Steps items={copy.iphoneSteps} />
          <h4>{copy.mac}</h4><Steps items={copy.macSteps} />
        </>}
        <div className="calendar-guide-help"><h4>{copy.help}</h4>
          <ul>{helpKeys.map((key) => <li key={key}><a href={help[key]} target="_blank" rel="noreferrer">{copy[key]}</a></li>)}</ul>
        </div>
      </details>
    </div>
  </section>;
}
