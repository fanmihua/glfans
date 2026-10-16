import { ArrowRight, CalendarBlank, CalendarCheck, CaretDown, DownloadSimple } from '@phosphor-icons/react';
import { withBase } from '../../lib/assets.js';
import { calendarGuideCopy, calendarGuideHelp } from './calendar-guide-copy.js';
import './calendar-guide.css';

const Steps = ({ items }) => <ol className="calendar-guide-steps">{items.map((item, index) => <li key={index}>{item}</li>)}</ol>;
const subscriptionImages = ['choose-zh', 'open-ios', 'added-ios'];
const importIcons = [CalendarBlank, DownloadSimple, CalendarCheck];

// Keep the guide beside the subscription panel so reading it preserves choices.
export function CalendarGuide({ locale, open, mode, onToggle, onModeChange, onSubscribe }) {
  const copy = calendarGuideCopy[locale] || calendarGuideCopy.zh;
  const help = calendarGuideHelp(locale);
  const importing = mode === 'import';
  const cards = importing ? copy.importCards : copy.subscribeCards;
  return <section className={`calendar-guide${open ? ' is-open' : ''}`}>
    <button type="button" className="calendar-guide-toggle" aria-expanded={open} aria-controls="calendar-guide-content" onClick={onToggle}>
      <span>{copy.toggle}</span><CaretDown size={15} aria-hidden="true" />
    </button>
    {open && <div className="calendar-guide-content" id="calendar-guide-content">
      <div className="calendar-guide-modes" role="group" aria-label={copy.modes}>
        <button type="button" aria-pressed={!importing} onClick={() => onModeChange('subscribe')}>{copy.subscribe}</button>
        <button type="button" aria-pressed={importing} onClick={() => onModeChange('import')}>{copy.import}</button>
      </div>
      <p className="calendar-guide-intro">{copy.subscribeIntro}</p>
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
      <p className="calendar-guide-note">{importing ? copy.importShortHint : copy.embeddedShort}</p>
      <div className="calendar-guide-footer">
        <button type="button" className="calendar-guide-subscribe" onClick={onSubscribe}>{copy.chooseSubscription}<ArrowRight size={16} aria-hidden="true" /></button>
        <details className="calendar-guide-details calendar-guide-more"><summary>{copy.moreHelp}</summary>
          {importing ? <>
            <p>{copy.exportScope}</p>
            <h4>{copy.macImport}</h4><Steps items={copy.macImportSteps} />
            <h4>{copy.googleImport}</h4><Steps items={copy.googleImportSteps} />
            <p>{copy.iphoneImport}</p><p>{copy.downloadNote}</p>
          </> : <>
            <p>{copy.subscribeScope}</p><p>{copy.independent}</p>
            <h4>{copy.iphone}</h4><Steps items={copy.iphoneSteps} />
            <h4>{copy.mac}</h4><Steps items={copy.macSteps} />
          </>}
          <div className="calendar-guide-help"><h4>{copy.help}</h4>
            <ul>{Object.entries(help).map(([key, href]) => <li key={key}><a href={href} target="_blank" rel="noreferrer">{copy[key]}</a></li>)}</ul>
          </div>
        </details>
      </div>
    </div>}
  </section>;
}
