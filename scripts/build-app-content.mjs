import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeAppContent } from './lib/app-content.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(process.argv[2] || path.join(root, 'dist/client'));
const manifest = await writeAppContent(root, output);
console.log(`App 内容 ${manifest.version}: ${Object.keys(manifest.files).length} 个数据文件 / ${Object.keys(manifest.assets).length} 张图片`);
