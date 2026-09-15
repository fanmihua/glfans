import { cpLabel } from '../cp/cp-names.js';

const normalize = (value = '') => String(value)
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/[·&._\-/\\'"’“”()（）]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const queryNeedles = (query) => {
  const literal = normalize(query);
  if (!literal) return [];

  const compact = literal.replace(/\s+/g, '');
  const latinCharacters = compact.match(/\p{Script=Latin}/gu) || [];
  const hasHanCharacter = /\p{Script=Han}/u.test(compact);
  if (!hasHanCharacter && latinCharacters.length === 1) return [];

  return compact === literal ? [literal] : [literal, compact];
};

export const archiveSearchQueryReady = (query) => queryNeedles(query.trim()).length > 0;

const matchScore = (values, needles) => {
  const normalized = values.map(normalize).filter(Boolean);
  if (needles.some(needle => normalized.some(value => value === needle))) return 0;
  if (needles.some(needle => normalized.some(value => value.startsWith(needle)))) return 1;
  return needles.some(needle => normalized.some(value => value.includes(needle))) ? 2 : -1;
};

export function archiveSearchResults(query, dramas, cps, limit = 8) {
  const needles = queryNeedles(query.trim());
  if (!needles.length) return [];

  const cpMatches = cps.map(cp => {
    const identityValues = [
      cpLabel(cp),
      ...(cp.names || []),
      ...(cp.aliases || []),
    ];
    const identityScore = matchScore(identityValues, needles);
    return {
      cp,
      personScore: matchScore(cp.names || [], needles),
      result: {
        id: `cp-${cp.id}`,
        kind: 'cp',
        href: `#/cp/${cp.id}`,
        label: cpLabel(cp),
        detail: (cp.names || []).join(' / '),
        score: identityScore,
      },
    };
  });

  const relatedDramaScores = new Map();
  cpMatches.forEach(({ cp, personScore }) => {
    if (personScore < 0 || personScore > 1) return;
    [...(cp.works || []), ...(cp.upcoming || [])].forEach(work => {
      if (!work.id) return;
      const relatedScore = personScore + 1;
      relatedDramaScores.set(work.id, Math.min(relatedDramaScores.get(work.id) ?? Infinity, relatedScore));
    });
  });

  const cpResults = cpMatches.map(({ result }) => result);

  const dramaResults = dramas.map(drama => {
    const titleScore = matchScore([
      drama.title,
      drama.titleEn,
    ], needles);
    const score = Math.min(titleScore >= 0 ? titleScore : Infinity, relatedDramaScores.get(drama.id) ?? Infinity);
    return {
      id: `drama-${drama.id}`,
      kind: 'drama',
      href: `#/archive/${drama.year}/${drama.id}`,
      label: drama.title,
      detail: [drama.titleEn, drama.year].filter(Boolean).join(' · '),
      score: Number.isFinite(score) ? score : -1,
    };
  });

  return [...cpResults, ...dramaResults]
    .filter(result => result.score >= 0)
    .sort((left, right) => left.score - right.score || left.kind.localeCompare(right.kind) || left.label.localeCompare(right.label))
    .slice(0, limit);
}
