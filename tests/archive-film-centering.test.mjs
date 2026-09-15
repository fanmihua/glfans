import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('archive deep links center the selected film on desktop and mobile', async () => {
  const source = await readFile(new URL('../src/ArchiveYearPage.jsx', import.meta.url), 'utf8');
  const centeringEffect = source.split('// A selected deep link')[1].split('// On mobile')[0];
  assert.ok(!centeringEffect.includes('if (!isMobile) return'));
  assert.ok(centeringEffect.includes('.archive-event-card.is-active'));
  assert.ok(centeringEffect.includes('track.scrollTo'));
  assert.ok(centeringEffect.includes('track.clientWidth / 2'));
  assert.ok(centeringEffect.includes('selectedEvent?.id'));
});

test('archive film has no blank end padding on desktop and mobile', async () => {
  const css = await readFile(new URL('../src/archive-year-page.css', import.meta.url), 'utf8');
  const tracks = css.split('.archive-event-film-track {').slice(1).map((block) => block.split('}')[0]);
  const desktopTrack = tracks[0];
  assert.ok(desktopTrack.includes('--event-card-width: clamp(188px, 14.2vw, 238px)'));
  assert.equal(tracks.length, 2);
  for (const track of tracks) {
    assert.match(track, /padding:\s*0;/);
    assert.ok(!track.includes('padding: 0 calc('));
    assert.ok(track.includes('grid-auto-columns: var(--event-card-width)'));
  }
});
