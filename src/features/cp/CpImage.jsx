import { createContext, useContext } from 'react';
import { withBase } from '../../lib/assets.js';
export const CpImageContext = createContext({});
export function CpImage({src, sizes='(max-width: 760px) calc(100vw - 36px), (max-width: 1050px) 45vw, 32vw', ...props}) {
  const variants = useContext(CpImageContext)[src];
  return <img {...props} src={withBase(src)} sizes={variants ? sizes : undefined} srcSet={variants?.map(v=>`${withBase(v.path)} ${v.width}w`).join(', ')} decoding="async" />;
}
