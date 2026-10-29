import { useRef } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import './search-field.css';

export function SearchField({ value, onChange, label, placeholder = label, clearLabel, className = '', inputRef }) {
  const ownInput = useRef(null);
  const input = inputRef || ownInput;
  return <div className={`site-search ${className}`}>
    <MagnifyingGlass size={18} aria-hidden="true" />
    <input ref={input} type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} aria-label={label} />
    {value && <button type="button" aria-label={clearLabel} onClick={() => { onChange(''); input.current?.focus(); }}><X size={16} aria-hidden="true" /></button>}
  </div>;
}
