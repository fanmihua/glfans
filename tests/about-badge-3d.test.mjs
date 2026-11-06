import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Box3, Quaternion, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { badgeCopy } from '../src/features/about/badge-copy.js';

const modelPath = '../public/assets/about/gl-badge-3d-52a81fb23d35b8d6.glb';

test('the self-contained badge model fits the mobile budget and preserves both faces', async () => {
  const bytes = await readFile(new URL(modelPath, import.meta.url));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.ok(bytes.length < 3 * 1024 * 1024);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '52a81fb23d35b8d6bba55f819bafc14f5f4f7a62298c928dcae524404ba51e70');
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  assert.equal(json.buffers.length, 1);
  assert.equal(json.buffers[0].uri, undefined);
  assert.equal(json.images, undefined);
  assert.ok(json.nodes.some(node => node.name === 'glfans.com'));
  assert.ok(json.nodes.some(node => node.name === '2026'));
  assert.deepEqual(json.extensionsUsed, ['KHR_materials_anisotropy'], 'no external compression decoder is needed');
  const triangles = json.meshes.reduce((sum, mesh) => sum + mesh.primitives.reduce((n, primitive) => n + json.accessors[primitive.indices].count / 3, 0), 0);
  assert.ok(triangles > 0 && triangles < 100000);
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  gltf.scene.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(gltf.scene);
  assert.ok(bounds.getCenter(new Vector3()).length() < 1e-6, 'the web copy is centered without changing the source geometry');
  const size = bounds.getSize(new Vector3());
  assert.ok(size.z > 1 && size.z < size.x / 2, 'real thickness is retained');
  const root = json.nodes[json.scenes[0].nodes[0]];
  const front = new Quaternion().fromArray(root.rotation).multiply(new Quaternion().fromArray(json.nodes[0].rotation));
  assert.ok(front.angleTo(new Quaternion()) < 1e-6, 'the default front faces the camera');
});

test('all viewer copy and camera announcements exist in Chinese, English and Thai', () => {
  const keys = Object.keys(badgeCopy.zh).sort();
  for (const [locale, copy] of Object.entries(badgeCopy)) {
    assert.deepEqual(Object.keys(copy).sort(), keys);
    assert.deepEqual(Object.keys(copy.a11y).sort(), Object.keys(badgeCopy.zh.a11y).sort());
    for (const value of [...Object.values(copy).filter(value => typeof value === 'string'), ...Object.values(copy.a11y)]) {
      assert.ok(value.trim().length > 0);
      if (locale !== 'zh') assert.doesNotMatch(value, /\p{Script=Han}/u);
    }
  }
});

test('every Figma viewer icon and decoration is a nonempty local SVG with intrinsic dimensions', async () => {
  for (const name of ['light-mask', 'zoom-in', 'zoom-out', 'reset', 'shadow', 'close']) {
    const source = await readFile(new URL(`../public/assets/about/badge-viewer-${name}.svg`, import.meta.url), 'utf8');
    assert.match(source, /<svg\b[^>]*\bwidth="[\d.]+"[^>]*\bheight="[\d.]+"/);
    assert.ok(source.length > 100);
    assert.doesNotMatch(source, /(?:href|src)="https?:/);
  }
});
