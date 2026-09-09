import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { CaretDown, Check } from '@phosphor-icons/react';
import { listenToMediaQuery } from '../lib/browser-compat.js';
import { changeLocale, getLocale, LANGUAGE_NAMES, LOCALES, subscribeLocale, t } from './runtime.js';

export const useLocale = () => useSyncExternalStore(subscribeLocale, getLocale, () => 'zh');

export function LanguageSwitcher({ home = false }) {
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const menuId = useId();
  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    optionRefs.current[LOCALES.indexOf(locale)]?.focus();
    const outside = event => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    const loseWindowFocus = () => setOpen(false);
    const visibilityChanged = () => { if (document.hidden) setOpen(false); };
    const media = window.matchMedia('(max-width: 760px)');
    const resized = () => { if (media.matches) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('blur', loseWindowFocus);
    document.addEventListener('visibilitychange', visibilityChanged);
    const stopListening = listenToMediaQuery(media, resized);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('blur', loseWindowFocus);
      document.removeEventListener('visibilitychange', visibilityChanged);
      stopListening();
    };
  }, [open, locale]);
  const choose = async code => {
    if (code === locale) return;
    setBusy(true); setError(false);
    try { await changeLocale(code); } catch { setError(true); }
    finally { setBusy(false); }
  };
  return (
    <div ref={rootRef} className={`language-switcher${home ? ' language-switcher--home' : ''}`}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <div className="language-dropdown">
        <button ref={triggerRef} type="button" className="language-trigger" disabled={busy}
          aria-label={`${t('选择语言')}: ${LANGUAGE_NAMES[locale]}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
          onClick={() => setOpen(value => !value)}
          onKeyDown={event => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true); } }}>
          <span lang={locale === 'zh' ? 'zh-CN' : locale}>{LANGUAGE_NAMES[locale]}</span>
          <CaretDown size={14} weight="bold" aria-hidden="true" />
        </button>
        {open && <div className="language-menu" id={menuId} role="menu" aria-label={t('选择语言')}
          onKeyDown={event => {
            const index = optionRefs.current.indexOf(document.activeElement);
            const next = { ArrowDown: (index + 1) % 3, ArrowUp: (index + 2) % 3, Home: 0, End: 2 }[event.key];
            if (next !== undefined) { event.preventDefault(); optionRefs.current[next]?.focus(); }
            if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); }
          }}>
          {LOCALES.map((code, index) => <button key={code} ref={node => { optionRefs.current[index] = node; }}
            type="button" role="menuitemradio" aria-checked={code === locale} tabIndex={-1}
            lang={code === 'zh' ? 'zh-CN' : code}
            onClick={() => { closeMenu(true); void choose(code); }}>
            <span>{LANGUAGE_NAMES[code]}</span>
            <Check size={16} weight="bold" aria-hidden="true" />
          </button>)}
        </div>}
      </div>
      <div className="language-tabs" role="group" aria-label={t('选择语言')} aria-busy={busy}>
        {LOCALES.map(code => (
          <button type="button" lang={code === 'zh' ? 'zh-CN' : code} key={code}
            aria-label={LANGUAGE_NAMES[code]} title={LANGUAGE_NAMES[code]} aria-pressed={locale === code} disabled={busy}
            onClick={() => void choose(code)}>
            <span>{ {zh: '中', en: 'EN', th: 'TH'}[code] }</span>
          </button>
        ))}
      </div>
      {(busy || error) && <span className="language-switcher-status" role="status">{t(error ? '语言加载失败，请重试' : '正在切换语言')}</span>}
    </div>
  );
}
