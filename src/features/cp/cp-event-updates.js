// Event dates are distinct from ticket sales, video publication and TV episodes.
// New entries were checked against official ticket listings on 2026-09-30.
// Older GMMTV fancon entries retain their own review date.
const checkedAt = '2026-09-30';
const fourElements = {
  title: '4 Elements Infinite Bonds Fan Meeting', kind: 'recap', date: '2026.09.12',
  source: 'https://www.thaiticketmajor.com/performance/4-elements-infinite-bonds-fan-meeting.html',
  publisher: 'North Star Entertainment · ThaiTicketMajor', checkedAt,
  image: 'assets/cp/events/four-elements-infinite-bonds-2026.webp',
  imageSource: 'https://www.thaiticketmajor.com/img_poster/prefix_1/0812/6812/4-elements-infinite-bonds-fan-meeting-6a4f1bffade4d-l.png',
};
const moonshadowSource = 'https://www.thaiticketmajor.com/performance/moonshadow-the-afterglow-fan-party-and-moonshadow-the-afterglow-after-party.html';

export const cpEventUpdates = {
  namtanfilm: [{ title: 'NAMTAN FILM GLAMOROUS FANCON', kind: 'announcement', date: '2026.11.13–14', source: 'https://www.gmm-tv.com/news/', publisher: 'GMMTV', checkedAt: '2026-09-21' }],
  milklove: [{ title: 'MILK LOVE WHIMSICAL HOUSE FANCON', kind: 'announcement', date: '2026.11.15', source: 'https://www.gmm-tv.com/news/', publisher: 'GMMTV', checkedAt: '2026-09-21' }],
  janjingjing: [{ title: 'JAN JINGJING BEWITCH YOU FANCON', kind: 'announcement', date: '2026.11.21–22', source: 'https://www.gmm-tv.com/news/', publisher: 'GMMTV', checkedAt: '2026-09-21' }],
  lingorm: [{
    title: 'LINGORM THE WORLD BETWEEN US CONCERT', kind: 'announcement', date: '2026.10.17–18',
    source: 'https://www.thaiticketmajor.com/concert/lingorm-the-world-between-us-concert.html',
    publisher: 'Channel 3 · ThaiTicketMajor', checkedAt,
    image: 'assets/cp/events/lingorm-world-between-us-2026.webp',
    imageSource: 'https://www.thaiticketmajor.com/img_poster/prefix_1/0879/6879/lingorm-the-world-between-us-concert-6a9c08f9e0dee-l.jpg',
  }],
  freenbecky: [{ ...fourElements }],
  engfacharlotte: [{ ...fourElements }],
  applemim: [{ ...fourElements }],
  namnoey: [{ ...fourElements }],
  lookmheesonya: [{
    title: 'LOOKMHEE SONYA EVERAFTER: BLOOM IN SÃO PAULO', kind: 'announcement', date: '2026.10.09',
    source: 'https://pixelticket.com.br/eventos/32854/lookmhee-sonya-everafter-bloom-in-sao-paulo',
    publisher: 'GIG Music · PixelTicket', checkedAt,
    image: 'assets/cp/events/lmsy-everafter-saopaulo-2026.webp',
    imageSource: 'https://d106p58duwuiz5.cloudfront.net/event/cover/0c90b3ec046e637db31c68265a844509.jpg',
  }],
  andalookkaew: [{
    title: 'ANDA LOOKKAEW UNFILTERED SESSION IN TAIPEI', kind: 'announcement', date: '2026.10.16',
    source: 'https://www.ticketmelon.com/th/NDEntertainment/andalookkaewunfiltered',
    publisher: 'ND Entertainment · Ticketmelon', checkedAt,
    image: 'assets/cp/events/andalookkaew-unfiltered-taipei-2026.webp',
    imageSource: 'https://tm-prod-event-files-v3.ticketmelon.com/e2e71d50af6511f1967801117567899b/poster/315cd1a4af6711f1923401117567899b.png',
  }],
  emibonnie: [
    {
      title: 'Moonshadow : The Afterglow Fan Party', kind: 'announcement', date: '2026.10.14',
      source: moonshadowSource, publisher: 'GMMTV · ThaiTicketMajor', checkedAt,
      image: 'assets/cp/events/moonshadow-afterglow-2026.webp',
      imageSource: 'https://www.thaiticketmajor.com/img_poster/prefix_1/0902/6902/moonshadow-the-afterglow-fan-party-and-moonshadow-the-afterglow-after-party-6ab380972d57d-l.jpg',
    },
    {
      title: 'Moonshadow : The Afterglow After Party', kind: 'announcement', date: '2026.10.15',
      source: moonshadowSource, publisher: 'GMMTV · ThaiTicketMajor', checkedAt,
    },
    // Keep the existing March event when overriding this CP's event list.
    {
      title: 'EMI BONNIE : LOVE SESSION', kind: 'recap', date: '2026.03.07–08',
      source: 'https://www.gmm-tv.com/news/4170/', publisher: 'GMMTV', checkedAt: '2026-09-10',
      image: 'assets/cp/emibonnie-love-session.jpg',
      imageSource: 'https://www.gmm-tv.com/cms/upload_file/news/pic/480x360/1b85445ed450075359742262d5100041.jpg',
    },
  ],
};
