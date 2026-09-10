import { Component, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, CalendarBlank, ChatCircleDots, Hash, InstagramLogo, XLogo } from '@phosphor-icons/react';
import { SiteHeader } from '../../SiteHeader.jsx';
import { useHashRoute } from '../../hooks/useHashRoute.js';
import { useLocale } from '../../i18n/LanguageSwitcher.jsx';
import { getLocale } from '../../i18n/runtime.js';
import { withBase } from '../../lib/assets.js';
import { cpProfiles, verifiedAt, cpStatusCopy, statusCheckedAt, zodiacLabels } from './cp-runtime-data.js';
import { cpCopy } from './cp-copy.js';
import { cpLabel, cpNameRecords } from './cp-names.js';
import { CpDirectory } from './CpDirectory.jsx';
import { CpChildren } from './CpChildren.jsx';
import { CpTimeline, CpMediaSection, jumpToJournal } from './CpJournal.jsx';
import { cpJournalCopy } from './cp-journal-copy.js';
import { CpImage, CpImageContext } from './CpImage.jsx';
import './cp-page.css';
import './generated/chrome.css';

const ArchiveCalendar = lazy(() => import('../../ArchiveCalendar.jsx').then(module => ({ default: module.ArchiveCalendar })));
const payloads = import.meta.glob('./generated/*.json');
const pages = Object.fromEntries(cpProfiles.map(cp=>[cp.id, lazy(async()=>{
  const module = await payloads[`./generated/${cp.id}.json`]();
  if (!module?.default || module.default.cp.id !== cp.id) throw new Error('CP profile could not be loaded');
  const data = module.default;
  return {default:()=> <CpContent data={data} />};
})]));
class CpLoadBoundary extends Component {
  state = {error:false};
  static getDerivedStateFromError() { return {error:true}; }
  render() {
    if (!this.state.error) return this.props.children;
    const text = {zh:['资料暂时未能加载，请重试。','重新加载'],en:['Could not load this profile. Please retry.','Reload'],th:['โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง','โหลดใหม่']}[getLocale()];
    return <><SiteHeader activePath="cp" /><main className="cp-main"><p role="alert">{text[0]}</p><button type="button" onClick={()=>window.location.reload()}>{text[1]}</button><a href="#/cp">{cpCopy[getLocale()].back}</a></main></>;
  }
}

function External({ href, children, ...props }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
}

function MemberFacts({ member, locale, copy }) {
  const profile = member.profile;
  const sign = profile.sign;
  return <div className="cp-member-facts">
    <p className="cp-member-fullname">{profile.fullName}</p>
    <dl><div><dt>{copy.birthday}</dt><dd>{profile.birthday ? <time dateTime={profile.birthday}>{profile.birthday.replace(/-/g, '.')}</time> : profile.birthdayMonthDay ? <>{profile.birthdayMonthDay.replace('-', '.')}<small className="cp-birth-year-note">{copy.birthYearPending}</small></> : copy.notVerified}</dd></div>
      {sign && <div><dt>{copy.zodiac}</dt><dd>{zodiacLabels[locale][sign]}</dd></div>}
      {profile.heightCm && <div><dt>{copy.height}</dt><dd>{profile.heightCm} cm</dd></div>}</dl>
  </div>;
}

function MemberSocials({ member, copy }) {
  const links = [
    { platform: 'Instagram', Icon: InstagramLogo, label: member.instagram && `@${member.instagram}`, href: member.instagram && `https://www.instagram.com/${member.instagram}/` },
    { platform: 'X', Icon: XLogo, label: member.x && `@${member.x}`, href: member.x && `https://x.com/${member.x}` },
    { platform: copy.weibo, Icon: ChatCircleDots, label: member.weibo?.handle ? `@${member.weibo.handle}` : copy.weibo, href: member.weibo?.url },
  ];
  return <div className="cp-member-socials">{links.map(({ platform, Icon, label, href }) => href ?
    <External key={platform} href={href} aria-label={`${member.name} · ${platform} · ${label}`}><Icon size={20} aria-hidden="true" /><span><small>{platform}</small>{label}</span><ArrowUpRight size={14} aria-hidden="true" /></External> :
    <p className="cp-social-unverified" key={platform}><Icon size={20} aria-hidden="true" /><span><small>{platform}</small>{copy.notVerified}</span></p>
  )}</div>;
}

export function CpPage() {
  const route = useHashRoute();
  const id = route[1] || cpProfiles[0].id;
  const Page = pages[id];
  return <CpLoadBoundary key={id}>{Page ? <Page /> : <CpContent />}</CpLoadBoundary>;
}

function CpContent({data}) {
  useLocale();
  const locale = getLocale();
  const copy = cpCopy[locale];
  const {cp=null, media=[], notice=null, child=null, collaboration=null, community=null, timeline=[], milestones=[], responsive={}, works:archiveWorks=[]} = data || {};
  const archiveById = new Map(archiveWorks.map(work=>[work.id,work]));
  const works = useRef(null);
  const calendarTrigger = useRef(null);
  const [calendar, setCalendar] = useState(null);
  useEffect(() => setCalendar(null), [cp]);
  const openCalendar = (event, items, label) => {
    calendarTrigger.current = event.currentTarget;
    setCalendar({ ids: items.map(work => work.id), label });
  };
  useLayoutEffect(() => {
    document.title = `${cp ? cpLabel(cp) : copy.title} · ${copy.title} · glfans`;
  }, [cp, copy]);

  return <CpImageContext.Provider value={responsive}><div className="cp-page" lang={locale === 'zh' ? 'zh-CN' : locale}>
    <SiteHeader activePath="cp" logoSrcSet={responsive['assets/glfans-logo-brush.webp']?.map(v=>`${withBase(v.path)} ${v.width}w`).join(', ')} />
    <main className="cp-main">
      <header className="cp-masthead">
        <div className="cp-masthead-title"><h1>{copy.title}</h1><span className="cp-black-label">CP ARCHIVE</span></div>
        <p>{copy.note}<CpImage src="assets/repo-handdrawn-heart-pink.webp" sizes="90px" alt="" /></p>
      </header>
      <CpDirectory cp={cp} copy={copy} locale={locale} />
      {!cp ? <section className="cp-not-found"><h2>{copy.notFound}</h2><a href="#/cp">{copy.back}<ArrowRight /></a></section> : <>
        <section className={`cp-identity${cp.image ? '' : ' cp-identity--text'}`} aria-labelledby="cp-name">
          {cp.image && <div className="cp-portrait"><CpImage key={cp.image} src={cp.image} sizes="(max-width: 760px) calc(100vw - 36px), 48vw" alt={cp.names.join(' & ')} width="1000" height={cp.id === 'emibonnie' || cp.id === 'freenbecky' ? 667 : cp.id === 'janjingjing' ? 914 : 1000} fetchPriority="high" data-page-critical="true" /></div>}
          <div className="cp-bio">
            {notice && <button type="button" className="cp-status-tag" onClick={() => jumpToJournal('cp-conclusion')}>{cpJournalCopy[locale].ended}<ArrowRight size={16} /></button>}
            {cpLabel(cp) !== cp.names.join('') && <p className="cp-pair-name">{cpLabel(cp)}</p>}
            <h2 id="cp-name" className={`cp-display cp-display--${cp.id}`}><span>{cp.names[0]}</span><span>{cp.names[1]}</span></h2>
            <p className="cp-intro">{cp.intro[locale]}</p>
            <div className="cp-members">{cp.members.map(member => <section className="cp-member" key={member.name}>
              <h3>{member.name}</h3>
              <MemberFacts member={member} locale={locale} copy={copy} />
              <MemberSocials member={member} copy={copy} />
            </section>)}</div>
            <div className="cp-community-link">
              <External href={community?.url || `https://s.weibo.com/weibo?q=${encodeURIComponent(`${cpLabel(cp)} 超话`)}`}><Hash size={20} aria-hidden="true" /><span>{community ? `${community.name} · ${copy.community}` : copy.searchCommunity}</span><ArrowUpRight size={16} aria-hidden="true" /></External>
              <small>{community ? copy.communityNote : copy.communityPending}</small>
            </div>
            <button className="cp-primary" type="button" onClick={() => {
              works.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
              works.current?.focus({ preventScroll: true });
            }}>{copy.viewWorks}<ArrowRight size={22} /></button>
            <button className="cp-calendar-link" type="button" aria-haspopup="dialog" onClick={event => openCalendar(event, cp.works, cpLabel(cp))}><CalendarBlank size={20} />{copy.cpCalendar}<ArrowRight size={18} /></button>
          </div>
        </section>
        <CpTimeline key={`timeline-${cp.id}`} cp={cp} events={timeline} archiveById={archiveById} locale={locale} />
        <section className="cp-works" id="cp-works" ref={works} tabIndex={-1} aria-labelledby="cp-works-title">
          <div className="cp-section-heading"><h2 id="cp-works-title">{copy.works}</h2><span>OUR WORKS</span></div>
          <div className="cp-work-grid">{[...cp.works, ...(cp.upcoming || []).map(work => ({ ...work, pending: true }))].map(work => {
            const media = work.pending ? work : archiveById.get(work.id);
            const href = work.pending ? work.source : `#/archive/${work.year}/${work.id}`;
            const linkProps = work.pending ? { target: '_blank', rel: 'noopener noreferrer' } : {};
            return <article className="cp-work" key={work.id} data-work-id={work.id}>
              <a className="cp-work-poster" href={href} {...linkProps} aria-label={`${work.title} · ${work.pending ? copy.openPreview : copy.viewWork}`} tabIndex={-1}><CpImage src={media.image} alt={work.pending ? `${work.title} · ${copy.previewImage}` : work.title} loading="lazy" width={media.width} height={media.height} style={{ objectPosition: media.focus || '50% 32%' }} /></a>
              <div className="cp-work-info"><a className="cp-work-title" href={href} {...linkProps}>{work.title}<ArrowUpRight size={22} /></a>
                <p className="cp-work-meta">{work.year}<span>{work.pending ? copy[work.status || 'upcoming'] : work.ensemble ? copy.ensemble : copy.pair}</span></p>
                {work.pending ? <p className="cp-work-note">{copy.previewImage} · {work.publisher}</p> : null}
                <div className="cp-work-actions">{work.pending ? <External className="cp-work-action" href={work.source}>{copy.openPreview}<ArrowUpRight size={16} /></External> : <>
                  <a className="cp-work-action" href={href}>{copy.archive}<ArrowRight size={16} /></a>
                  <button type="button" className="cp-calendar-link" aria-haspopup="dialog" onClick={event => openCalendar(event, [work], work.title)}><CalendarBlank size={18} />{copy.calendar}</button>
                </>}</div>
              </div>
            </article>;
          })}</div>
        </section>
        <CpChildren cp={cp} child={child} locale={locale} />
        {['music','video'].map(category => <CpMediaSection key={`${cp.id}-${category}`} category={category} items={media.filter(item => item.category === category)} archiveById={archiveById} locale={locale} />)}
        {(cp.events.length > 0 || cp.shops.length > 0) && <div className="cp-updates">
          {cp.events.length > 0 && <section><div className="cp-section-heading"><h2>{copy.events}</h2><span>EVENT</span></div>
            {cp.events.map(event => <article key={event.title} className="cp-info-entry">{event.image && <External href={event.source} tabIndex={-1}><CpImage className="cp-event-image" src={event.image} alt={event.title} loading="lazy" width="480" height="360" /></External>}<h3>{event.title}</h3><p>{copy[event.kind]}{event.date && ` · ${event.date}`}</p><External className="cp-entry-link" href={event.source}>{event.kind === 'recap' ? copy.openRecap : copy.openEvent}<ArrowUpRight size={18} /></External><small>{event.publisher} · {copy.checked} {verifiedAt}</small></article>)}
          </section>}
          {cp.shops.length > 0 && <section><div className="cp-section-heading"><h2>{copy.shops}</h2><span>SHOP</span></div>
            {cp.shops.map(shop => <article key={shop.url} className="cp-info-entry"><h3>{shop.title}</h3><p>{shop.owner && `${shop.owner} · `}{copy[shop.kind]}</p><External className="cp-entry-link" href={shop.url}>{shop.kind === 'officialShop' ? copy.openShop : copy.openBrand}<ArrowUpRight size={18} /></External></article>)}
          </section>}
        </div>}
        <details className="cp-sources" key={cp.id}><summary>{copy.sources}</summary>
          <p className="cp-source-note">{copy.sourceNote}<span>{copy.checked} {verifiedAt}</span></p>
          <p className="cp-source-note">{copy.pairNote}</p>
          <p className="cp-source-note">{cpStatusCopy[locale].note} {cpStatusCopy[locale].checked} {statusCheckedAt}</p>
          {collaboration.evidence && <External className="cp-source-link" href={collaboration.evidence.source}>{cpStatusCopy[locale][collaboration.status]} · {collaboration.evidence.title || collaboration.evidence.publisher}<ArrowUpRight size={12} /></External>}
          {cpNameRecords[cp.id] && <External className="cp-source-link" href={cpNameRecords[cp.id].source}>{cpLabel(cp)} · {copy.pairNameSource}<ArrowUpRight size={12} /></External>}
          <p className="cp-source-note">{copy.zodiacNote}</p>
          <p className="cp-source-note">{copy.profileNote}</p>
          <div>{[...cp.members, ...cp.works, ...(cp.upcoming || []), ...cp.events, ...cp.shops].map((item, index) => <External className="cp-source-link" key={index} href={item.source}>{item.name || item.title}<ArrowUpRight size={12} /></External>)}</div>
          <div>{cp.members.flatMap(member => member.profile.references.map(reference => <External className="cp-source-link" key={`${member.name}-${reference.url}`} href={reference.url}>{member.name} · {copy.referenceKinds[reference.kind]}<ArrowUpRight size={12} /></External>))}</div>
          {community && <External className="cp-source-link" href={community.source}>{community.name} · {copy.communityNote}<ArrowUpRight size={12} /></External>}
          <div>{[...media, ...milestones].map(item => <External className="cp-source-link" key={item.id} href={item.source}>{item.title}<ArrowUpRight size={12} /></External>)}</div>
          {child && <div><External className="cp-source-link" href={child.source}>{child.name} · {child.publisher}<ArrowUpRight size={12} /></External><External className="cp-source-link" href={child.video.url}>{child.name} · MY IDEAL FAN<ArrowUpRight size={12} /></External></div>}
        </details>
      </>}
    </main>
    <Suspense fallback={null}>{calendar && <ArchiveCalendar initialSeriesIds={calendar.ids} scopeLabel={calendar.label} returnFocus={calendarTrigger.current} onClose={() => setCalendar(null)} />}</Suspense>
  </div></CpImageContext.Provider>;
}
