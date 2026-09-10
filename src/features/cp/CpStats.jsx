import { countCpStatuses, cpStatusCopy } from './cp-runtime-data.js';

export function CpStats({ locale }) {
  const counts = countCpStatuses(), copy = cpStatusCopy[locale];
  return <div className="cp-stats" aria-label={copy.label}>
    <span className="cp-stats-total"><b>{counts.total}</b> CP</span>
    {['active','ended','unverified'].map(status => <span className={`cp-stats-${status}`} key={status}>{copy[status]} <b>{counts[status]}</b></span>)}
  </div>;
}
