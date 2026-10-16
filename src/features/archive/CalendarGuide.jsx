import { ArrowRight, CaretDown } from '@phosphor-icons/react';
import { calendarGuideCopy, calendarGuideHelp } from './calendar-guide-copy.js';
import './calendar-guide.css';

const Steps = ({ items }) => <ol className="calendar-guide-steps">{items.map((item, index) => <li key={index}>{item}</li>)}</ol>;

// This is a sibling of the subscription panel: changing guide pages never
// unmounts the user's in-progress subscription choices.
export function CalendarGuide({ locale, open, mode, onToggle, onModeChange, onSubscribe }) {
  const copy = calendarGuideCopy[locale] || calendarGuideCopy.zh;
  const help = calendarGuideHelp(locale);
  return <section className={`calendar-guide${open ? ' is-open' : ''}`}>
    <button type="button" className="calendar-guide-toggle" aria-expanded={open} aria-controls="calendar-guide-content" onClick={onToggle}>
      <span>{copy.toggle}</span><CaretDown size={15} aria-hidden="true" />
    </button>
    {open && <div className="calendar-guide-content" id="calendar-guide-content">
      <div className="calendar-guide-modes" role="group" aria-label={copy.modes}>
        <button type="button" aria-pressed={mode === 'subscribe'} onClick={() => onModeChange('subscribe')}>{copy.subscribe}</button>
        <button type="button" aria-pressed={mode === 'import'} onClick={() => onModeChange('import')}>{copy.import}</button>
      </div>
      {mode === 'import' ? <>
        <p>{copy.importIntro}</p>
        <Steps items={copy.importSteps} />
        <p className="calendar-guide-note">{copy.exportScope}</p>
        <h4>{copy.macImport}</h4><Steps items={copy.macImportSteps} />
        <h4>{copy.googleImport}</h4><Steps items={copy.googleImportSteps} />
        <p>{copy.iphoneImport}</p><p className="calendar-guide-note">{copy.downloadNote}</p>
      </> : <>
        <p>{copy.subscribeIntro}</p>
        <Steps items={copy.subscribeSteps} />
        <p className="calendar-guide-note">{copy.subscribeScope}</p>
        <p>{copy.independent}</p>
        <p className="calendar-guide-note">{copy.embedded}</p>
        <details className="calendar-guide-details"><summary>{copy.manual}</summary>
          <h4>{copy.iphone}</h4><Steps items={copy.iphoneSteps} />
          <h4>{copy.mac}</h4><Steps items={copy.macSteps} />
        </details>
      </>}
      <button type="button" className="calendar-guide-subscribe" onClick={onSubscribe}>{copy.chooseSubscription}<ArrowRight size={16} aria-hidden="true" /></button>
      <details className="calendar-guide-details calendar-guide-help"><summary>{copy.help}</summary>
        <ul>{Object.entries(help).map(([key, href]) => <li key={key}><a href={href} target="_blank" rel="noreferrer">{copy[key]}</a></li>)}</ul>
      </details>
    </div>}
  </section>;
}
