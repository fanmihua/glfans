import { readdir, writeFile } from 'node:fs/promises';
import { SITE_NAVIGATION } from '../src/app/routes.js';

const root = new URL('../dist/client/', import.meta.url);
const assets = await readdir(new URL('assets/', root));
for (const component of ['HomePage', 'AdminPage', 'PitRadioPage', 'WordsTideLab']) {
  if (!assets.some(file => file.startsWith(`${component}-`) && file.endsWith('.js'))) {
    throw new Error(`Missing restored module: ${component}`);
  }
}
await writeFile(new URL('public-build.json', root), JSON.stringify({
  mode: 'full', publicSections: SITE_NAVIGATION.map(item => item.id),
  communityEnabled: true, radioEnabled: true,
  appSections: ['archive', 'cp', 'column', 'memes', 'about'],
}, null, 2) + '\n');
console.log('Prepared full website; independent article visibility and App scope retained.');
