import { ArrowUpRight, Play } from '@phosphor-icons/react';
import { withBase } from '../../lib/assets.js';
import { cpChildrenCopy } from './cp-runtime-data.js';
import { CpImage } from './CpImage.jsx';
import './cp-children.css';

export function CpChildren({ cp, child, locale }) {
  if (!child) return null;
  const copy = cpChildrenCopy[locale];
  return <section className="cp-children" id="cp-children" aria-labelledby="cp-children-title" tabIndex={-1}>
    <div className="cp-section-heading"><h2 id="cp-children-title">{copy.title}</h2><span>WITH LOVE</span></div>
    <p className="cp-children-intro">{copy.note}</p>
    <article className="cp-child-album" data-child={child.name}>
      <figure className="cp-child-photo">
        <CpImage src={child.image} alt={`${child.name} · ${cp.names.join(' & ')}`} loading="lazy" />
        <figcaption>{child.name}<span>{child.publisher}</span></figcaption>
      </figure>
      <div className="cp-child-story">
        <p className="cp-child-family">{cp.names.join(' & ')}<CpImage src="assets/repo-handdrawn-heart-pink.webp" sizes="40px" alt="" /></p>
        <h3>{child.name}</h3>
        <p className="cp-child-date">{copy.hello}<time dateTime={child.introduced}>{child.introduced.replace(/-/g, '.')}</time></p>
        <p className="cp-child-description">{child.story[locale]}</p>
        <a className="cp-child-film" href={child.video.url} target="_blank" rel="noopener noreferrer" aria-label={`${child.name} · ${copy.watch}`}>
          <span className="cp-child-film-image"><CpImage src={child.video.image} sizes="160px" alt="" width="1280" height="720" loading="lazy" /><i><Play weight="fill" size={16} /></i></span>
          <span><strong>{copy.story}</strong><small>MY IDEAL FAN</small></span><ArrowUpRight size={18} />
        </a>
      </div>
    </article>
  </section>;
}
