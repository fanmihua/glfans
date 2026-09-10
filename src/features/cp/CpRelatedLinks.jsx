import { ArrowUpRight } from '@phosphor-icons/react';
import { getLocale } from '../../i18n/runtime.js';
import { cpsForWork } from './cp-runtime-data.js';
import { cpCopy } from './cp-copy.js';
import { cpLabel } from './cp-names.js';
import './cp-related.css';

export function CpRelatedLinks({ seriesId, onNavigate }) {
  const related = cpsForWork(seriesId);
  if (!related.length) return null;
  return <nav className="cp-related-links" aria-label={cpCopy[getLocale()].related}>
    <span>{cpCopy[getLocale()].related}</span>
    {related.map(cp => <a key={cp.id} href={`#/cp/${cp.id}`} onClick={onNavigate}>{cpLabel(cp)}<ArrowUpRight size={15} /></a>)}
  </nav>;
}
