export function initialCalendarSubscription(scopeIds, followedIds, availableIds) {
  const available = new Set(availableIds);
  const preferred = scopeIds?.length ? scopeIds : followedIds || [];
  const seriesIds = [...new Set(preferred.filter(id => available.has(id)))].sort();
  return { mode: seriesIds.length ? 'selected' : 'all', seriesIds };
}

export function calendarSubscriptionLinks({ origin, locale, mode, seriesIds = [] }) {
  if (!['zh', 'en', 'th'].includes(locale)) throw new Error('Unsupported calendar language');
  if (!['all', 'selected'].includes(mode)) throw new Error('Unsupported calendar subscription mode');
  const ids = [...new Set(seriesIds)].sort();
  if (mode === 'selected' && !ids.length) return null;
  if (mode === 'selected' && ids.some(id => typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(id))) throw new Error('Invalid calendar series ID');
  const source = new URL(origin);
  if (!['http:', 'https:'].includes(source.protocol)) throw new Error('Calendar subscriptions require an HTTP origin');
  const url = new URL('/api/calendar.ics', source.origin);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) url.protocol = 'https:';
  url.searchParams.set('lang', locale);
  if (mode === 'selected') url.searchParams.set('series', ids.join(','));
  return { https: url.href, webcal: url.href.replace(/^https?:/, 'webcal:') };
}
