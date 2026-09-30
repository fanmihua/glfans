import { optimizeImage } from './lib/optimize-image.mjs';
const [input, directory] = process.argv.slice(2);
if (!input || !directory) throw new Error('Usage: node scripts/optimize-media.mjs <source-image> <output-directory>');
const { buffer, ...result } = await optimizeImage(input, { directory });
console.log(JSON.stringify(result, null, 2));
