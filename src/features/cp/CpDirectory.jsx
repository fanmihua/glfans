import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CaretDown, MagnifyingGlass, X } from '@phosphor-icons/react';
import { useMobileLayout } from '../../hooks/useMobileLayout.js';
import { cpProfiles } from './cp-runtime-data.js';
import { cpLabel, filterCps } from './cp-names.js';
import { CpStats } from './CpStats.jsx';
import { cpStatusCopy, statusForCp } from './cp-runtime-data.js';

const archiveById = new Map(cpProfiles.flatMap(cp=>cp.works.map(work=>[work.id,{title:work.titleZh}])));

export function CpDirectory({ cp, copy, locale }) {
  const mobile = useMobileLayout();
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const rail = useRef(null), toggle = useRef(null), mobileBar = useRef(null), input = useRef(null), dialog = useRef(null);
  const visibleCps = filterCps(cpProfiles, search, archiveById);
  useEffect(() => { setExpanded(false); setSearch(''); }, [mobile]);
  useLayoutEffect(() => {
    const list = rail.current;
    const selected = list?.querySelector('[aria-current="page"]');
    if (selected && list.scrollWidth > list.clientWidth) {
      list.scrollLeft += selected.getBoundingClientRect().left - list.getBoundingClientRect().left - (list.clientWidth - selected.clientWidth) / 2;
    }
  }, [cp, expanded, search, mobile]);
  useLayoutEffect(() => {
    if (!mobile || !expanded) return;
    const node = dialog.current;
    const rootOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    const panelTop = mobileBar.current?.getBoundingClientRect().bottom;
    if (panelTop != null) node.style.setProperty('--cp-directory-top', `${Math.round(panelTop)}px`);
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    node.showModal();
    node.querySelector('h2')?.focus({ preventScroll: true });
    return () => {
      node.close();
      document.documentElement.style.overflow = rootOverflow;
      document.body.style.overflow = bodyOverflow;
      if (toggle.current?.isConnected) toggle.current.focus({ preventScroll: true });
    };
  }, [mobile, expanded]);
  const close = () => setExpanded(false);
  const select = () => {
    setExpanded(false); setSearch('');
    toggle.current?.focus({ preventScroll: true });
  };
  const searchBox = <div className="cp-search"><MagnifyingGlass size={18} aria-hidden="true" />
    <input ref={input} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={copy.search} aria-label={copy.search} />
    {search && <button type="button" aria-label={copy.clearSearch} onClick={() => { setSearch(''); input.current?.focus(); }}><X size={16} /></button>}
  </div>;
  const allList = <nav id="cp-all-list" className="cp-all-grid" aria-label={copy.expandAll}>
    {visibleCps.map(item => <a key={item.id} href={`#/cp/${item.id}`} aria-current={cp?.id === item.id ? 'page' : undefined} onClick={select}><strong>{cpLabel(item)}</strong><span>{item.names.join(' / ')}</span><small className={`cp-directory-state cp-directory-state--${statusForCp(item.id).status}`}>{cpStatusCopy[locale][statusForCp(item.id).status]}</small></a>)}
    {!visibleCps.length && <p className="cp-search-empty" role="status">{copy.noResults}</p>}
  </nav>;
  if (mobile) return <>
    <div className="cp-mobile-stats"><CpStats locale={locale} /></div>
    <div ref={mobileBar} className="cp-directory cp-directory--mobile"><button ref={toggle} type="button" className="cp-mobile-switch" aria-haspopup="dialog" aria-expanded={expanded} aria-controls="cp-directory-dialog" aria-label={`${cp ? cpLabel(cp) : copy.title} · ${copy.expandAll}`} onClick={() => setExpanded(true)}>
      <strong>{cp ? cpLabel(cp) : copy.title}</strong><span>{copy.switchCp}<CaretDown size={18} /></span>
    </button></div>
    {expanded && createPortal(<dialog ref={dialog} id="cp-directory-dialog" className="cp-directory-dialog" aria-labelledby="cp-directory-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="cp-directory-dialog-bar"><button type="button" className="cp-mobile-switch" aria-expanded="true" aria-controls="cp-directory-dialog" aria-label={`${cp ? cpLabel(cp) : copy.title} · ${copy.closeDirectory}`} onClick={close}>
        <strong>{cp ? cpLabel(cp) : copy.title}</strong><span>{copy.switchCp}<CaretDown size={18} /></span>
      </button></div>
      <div className="cp-directory-panel">
        <div className="cp-sheet-header"><h2 id="cp-directory-title" tabIndex={-1}>{copy.allCps}</h2><span aria-live="polite">{visibleCps.length} / {cpProfiles.length}</span></div>
        <div className="cp-sheet-search"><CpStats locale={locale} />{searchBox}</div>{allList}
      </div>
    </dialog>,document.body)}
  </>;
  return <div className="cp-directory" onKeyDown={event => { if (event.key === 'Escape') { close(); toggle.current?.focus(); } }}>
    <div className="cp-directory-tools"><CpStats locale={locale} />{searchBox}</div>
    <div className="cp-selector-row"><nav ref={rail} className="cp-selector" aria-label={copy.select}>
      {visibleCps.map(item => <a key={item.id} href={`#/cp/${item.id}`} title={item.names.join(' / ')} onClick={select} aria-current={cp?.id === item.id ? 'page' : undefined}>{cpLabel(item)}</a>)}
      {!visibleCps.length && <p className="cp-search-empty" role="status">{copy.noResults}</p>}
    </nav><button ref={toggle} type="button" className="cp-directory-toggle" aria-expanded={expanded} aria-controls="cp-all-list" aria-label={expanded ? copy.collapseAll : copy.expandAll} onClick={() => setExpanded(value => !value)}>{expanded ? copy.collapse : copy.all}<CaretDown size={16} /></button></div>
    {expanded && allList}
  </div>;
}
