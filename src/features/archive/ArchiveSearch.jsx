import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { getLocale } from '../../i18n/runtime.js';
import { useMobileLayout } from '../../hooks/useMobileLayout.js';
import { archiveDramas } from '../../data/archive-dramas.js';
import { cpCopy } from '../cp/cp-copy.js';
import { cpProfiles } from '../cp/cp-runtime-data.js';
import { archiveSearchQueryReady, archiveSearchResults } from './archive-search.js';
import './archive-search.css';

export function ArchiveSearch() {
  const isMobile = useMobileLayout();
  const resultsId = useId();
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchPanelPosition, setSearchPanelPosition] = useState(null);
  const searchFormRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchPanelRef = useRef(null);
  const locale = getLocale();
  const searchCopy = {
    ...cpCopy[locale],
    noArchiveResults: {
      zh: '没有找到匹配的 CP、演员或剧集。',
      en: 'No matching CP, actor, or series.',
      th: 'ไม่พบคู่จิ้น นักแสดง หรือซีรีส์ที่ตรงกัน',
    }[locale],
    resultLabel: { zh: '搜索结果', en: 'Search results', th: 'ผลการค้นหา' }[locale],
    kinds: { cp: 'CP', drama: { zh: '剧集', en: 'Series', th: 'ซีรีส์' }[locale] },
  };
  const searchReady = archiveSearchQueryReady(search);
  const searchResults = useMemo(() => archiveSearchResults(search, archiveDramas, cpProfiles), [search, locale]);

  useEffect(() => {
    if (!searchOpen) return;
    const closeSearch = (event) => {
      if (!searchFormRef.current?.contains(event.target) && !searchPanelRef.current?.contains(event.target)) setSearchOpen(false);
    };
    document.addEventListener('pointerdown', closeSearch);
    return () => document.removeEventListener('pointerdown', closeSearch);
  }, [searchOpen]);

  useLayoutEffect(() => {
    if (!searchOpen || !searchReady) {
      setSearchPanelPosition(null);
      return;
    }
    const positionPanel = () => {
      const rect = searchFormRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gutter = 18;
      const width = Math.min(rect.width, window.innerWidth - gutter * 2);
      setSearchPanelPosition({
        top: Math.round(rect.bottom + 8),
        left: Math.round(Math.min(Math.max(gutter, rect.left), window.innerWidth - width - gutter)),
        width: Math.round(width),
      });
    };
    positionPanel();
    window.addEventListener('resize', positionPanel);
    window.addEventListener('scroll', positionPanel, true);
    return () => {
      window.removeEventListener('resize', positionPanel);
      window.removeEventListener('scroll', positionPanel, true);
    };
  }, [isMobile, searchOpen, searchReady]);

  const openSearchResult = (result) => {
    setSearchOpen(false);
    window.location.hash = result.href;
  };

  return (
    <>
      <form
        ref={searchFormRef}
        className="archive-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (searchResults[0]) openSearchResult(searchResults[0]);
        }}
        onFocus={() => setSearchOpen(true)}
        onBlur={(event) => {
          if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) && !searchPanelRef.current?.contains(event.relatedTarget)) setSearchOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setSearchOpen(false);
            searchInputRef.current?.focus();
          }
        }}
      >
        <MagnifyingGlass size={18} aria-hidden="true" />
        <input
          ref={searchInputRef}
          type="search"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }}
          placeholder={searchCopy.search}
          aria-label={searchCopy.search}
          aria-controls={resultsId}
          aria-expanded={Boolean(searchPanelPosition)}
        />
        {search && <button type="button" className="archive-search-clear" aria-label={searchCopy.clearSearch} onClick={() => { setSearch(''); searchInputRef.current?.focus(); }}><X size={16} aria-hidden="true" /></button>}
      </form>
      {searchPanelPosition && createPortal(<div ref={searchPanelRef} id={resultsId} className="archive-search-results" aria-label={searchCopy.resultLabel} style={searchPanelPosition}>
          {searchResults.length ? <ul>
            {searchResults.map(result => <li key={result.id}>
              <button type="button" onClick={() => openSearchResult(result)}>
                <span><b>{result.label}</b><small>{result.detail}</small></span>
                <em>{searchCopy.kinds[result.kind]}</em>
              </button>
            </li>)}
          </ul> : <p role="status">{searchCopy.noArchiveResults}</p>}
        </div>, document.body)}
    </>
  );
}
