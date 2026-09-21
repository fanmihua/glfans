// Conflicts found by the 2026-09-21 cross-catalogue audit. Never silently
// replace premiere/screening/VIP dates with a different distribution window.
// Original values remain in archive-dramas.js for the next evidence review.
export const archiveFactReviews = {
  blank: { fields: ['endDate'], reason: 'Finale catalogues disagree between April 6 and April 7.' },
  'i-am-devil': { fields: ['endDate', 'episodes'], reason: 'Original web run and later recut TV version must be distinguished.' },
  'somewhere-somehow': { fields: ['endDate'], reason: 'October 26 final screening versus October 31 regular distribution.' },
  'roller-coaster': { fields: ['endDate'], reason: 'Early access and October 8 YouTube finale use different dates.' },
  queendom: { fields: ['endDate'], reason: 'October 16 fast-track versus October 23 regular release.' },
  'frozen-valentine': { fields: ['startDate', 'endDate'], reason: 'MCOT Saturday broadcast versus WeTV Thursday release.' },
  'shadow-of-love': { fields: ['endDate'], reason: 'Batch distribution May 12 versus final segment May 14.' },
};
