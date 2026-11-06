import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Box3, Quaternion, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const linear = value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;

// This importer is for the supplied Vector to 3D badge: embedded geometry,
// no external files, and front/back meshes sharing the author's display tilt.
export async function prepareAboutBadge(source) {
  if (source.readUInt32LE(0) !== 0x46546c67 || source.readUInt32LE(4) !== 2 || source.readUInt32LE(8) !== source.length) {
    throw new Error('Expected a complete GLB 2.0 badge');
  }
  const jsonLength = source.readUInt32LE(12);
  const document = JSON.parse(source.subarray(20, 20 + jsonLength).toString());
  if (document.buffers.some(buffer => buffer.uri) || document.images?.length) {
    throw new Error('The badge must be self-contained, without external textures or buffers');
  }
  const sceneIndex = document.scene || 0;
  const scene = document.scenes[sceneIndex];
  const rotation = new Quaternion().fromArray(document.nodes[scene.nodes[0]].rotation || [0, 0, 0, 1]).invert();
  const gltf = await new GLTFLoader().parseAsync(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength), '');
  gltf.scene.quaternion.copy(rotation);
  gltf.scene.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(gltf.scene);
  const center = bounds.getCenter(new Vector3());
  const root = document.nodes.length;
  document.nodes.push({
    name: 'Web display: centered front view', rotation: rotation.toArray(),
    translation: center.toArray().map(value => -value), children: scene.nodes,
  });
  scene.nodes = [root];
  // The supplied export stores its authored 8-bit sRGB colors directly as
  // factors. glTF PBR expects linear factors; convert the web copy so the dark
  // enamel, gold and colored bands match the supplied finished reference art.
  for (const material of document.materials || []) {
    const rgba = material.pbrMetallicRoughness?.baseColorFactor;
    if (rgba) material.pbrMetallicRoughness.baseColorFactor = [...rgba.slice(0, 3).map(linear), rgba[3]];
  }
  const json = Buffer.from(JSON.stringify(document));
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
  json.copy(padded);
  const binaryChunks = source.subarray(20 + jsonLength);
  const bytes = Buffer.alloc(20 + padded.length + binaryChunks.length);
  bytes.writeUInt32LE(0x46546c67, 0);
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(padded.length, 12);
  bytes.writeUInt32LE(0x4e4f534a, 16);
  padded.copy(bytes, 20);
  binaryChunks.copy(bytes, 20 + padded.length);
  if (bytes.length > 3 * 1024 * 1024) throw new Error('Badge exceeds the 3 MiB web model budget');
  const sha256 = hash(bytes);
  return { bytes, sha256, sourceSha256: hash(source), filename: `gl-badge-3d-${sha256.slice(0, 16)}.glb` };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/import-about-badge.mjs /path/to/badge.glb');
  const result = await prepareAboutBadge(await readFile(process.argv[2]));
  await writeFile(new URL(`../public/assets/about/${result.filename}`, import.meta.url), result.bytes);
  console.log(JSON.stringify({ file: result.filename, sha256: result.sha256, sourceSha256: result.sourceSha256, bytes: result.bytes.length }, null, 2));
}
