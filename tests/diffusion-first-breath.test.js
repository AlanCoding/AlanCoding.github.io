import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

async function readProjectFile(relativePath) {
  const target = path.join(root, relativePath);
  return readFile(target, 'utf8');
}

test('First Breath page copy introduces the GPU diffusion experiment', async () => {
  const html = await readProjectFile('projects/diffusion-first-breath/index.html');
  assert.match(html, /First Breath/);
  assert.match(html, /GPU diffusion experiment/);
  assert.match(html, /WebGPU/);
});

test('Projects index links to the First Breath experience', async () => {
  const html = await readProjectFile('projects/index.html');
  assert.match(html, /First Breath \(GPU Diffusion\)/);
  assert.match(html, /diffusion-first-breath/);
  assert.match(html, /GPU • WebGPU/);
});

test('Shader pipelines are configured for compute diffusion', async () => {
  const pipelineCode = await readProjectFile('projects/diffusion-first-breath/pipelines.js');
  assert(pipelineCode.includes('createComputePipeline'), 'pipelines.js should create compute pipelines');
  const mainCode = await readProjectFile('projects/diffusion-first-breath/main.js');
  assert(mainCode.includes('dispatchWorkgroups'), 'main.js should dispatch workgroups on the GPU');
});
