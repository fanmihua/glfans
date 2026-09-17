import { rm, readdir, writeFile } from 'node:fs/promises';

// 只裁剪可重新生成的发布产物，原始素材继续保留在 public 中。
const root = new URL('../dist/client/', import.meta.url);
const hiddenAssets = ['pit-radio'];
for (const directory of hiddenAssets) {
  await rm(new URL(`assets/${directory}/`, root), { recursive: true, force: true });
}
const files = await readdir(new URL('assets/', root));
const hiddenChunks = files.filter(file => /^(?:HomePage|AdminPage|PitRadioPage|WordsTideLab|community-api)-.*\.(?:js|css)$/.test(file));
if (hiddenChunks.length) throw new Error(`Hidden modules remain in the filing build: ${hiddenChunks.join(', ')}`);
await writeFile(new URL('filing-build.json', root), JSON.stringify({
  mode: 'filing',
  publicSections: ['archive', 'cp', 'column', 'memes', 'about'],
  calendar: 'archive/calendar',
  communityEnabled: false,
  radioEnabled: false,
}, null, 2) + '\n');
console.log('Prepared filing build: source material retained; hidden section assets excluded.');
