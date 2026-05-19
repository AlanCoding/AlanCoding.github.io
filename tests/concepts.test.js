import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

async function readSiteFile(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

test('home page lists the concept section and links to each breakout page', async () => {
  const html = await readSiteFile('index.html');
  assert.match(html, /Original Space Concepts/);
  assert.match(html, /🌀🌬️ Flow Dividers for Artificial Gravity in Air/);
  assert.match(html, /Kardashev range: 0\.73–1\.7/);
  assert.match(html, /\/concepts\/flow-dividers\//);
  assert.match(html, /\/concepts\/self-gravity-walls\//);
  assert.match(html, /\/concepts\/l1-diamond-stabilizer\//);
  assert.match(html, /\/concepts\/atmospheric-scoop-divers\//);
  assert.match(html, /\/concepts\/stealth-craft-in-space\//);
  assert.match(html, /\/concepts\/petawatt-radiators\//);
});

test('petawatt radiator page includes both local renders and a back link', async () => {
  const html = await readSiteFile('concepts/petawatt-radiators/index.html');
  assert.match(html, /Back to home/);
  assert.match(html, /render_01_main_isometric\.png/);
  assert.match(html, /render_04_rear_radiator\.png/);
});

test('external concept pages include the requested outbound links', async () => {
  const flowHtml = await readSiteFile('concepts/flow-dividers/index.html');
  const gravityHtml = await readSiteFile('concepts/self-gravity-walls/index.html');
  const diamondHtml = await readSiteFile('concepts/l1-diamond-stabilizer/index.html');
  const scoopHtml = await readSiteFile('concepts/atmospheric-scoop-divers/index.html');
  const stealthHtml = await readSiteFile('concepts/stealth-craft-in-space/index.html');
  const radiatorHtml = await readSiteFile('concepts/petawatt-radiators/index.html');

  assert.match(flowHtml, /https:\/\/gravitationalballoon\.blogspot\.com\//);
  assert.match(flowHtml, /https:\/\/github\.com\/AlanCoding\/gravitational-balloon-mathematics/);
  assert.match(gravityHtml, /https:\/\/gravitationalballoon\.blogspot\.com\//);
  assert.match(gravityHtml, /https:\/\/github\.com\/AlanCoding\/gravitational-balloon-mathematics/);
  assert.match(diamondHtml, /\/2025\/10\/08\/l1-diamond-nitrogen-factory\.html/);
  assert.match(diamondHtml, /https:\/\/github\.com\/AlanCoding\/orbital-shape-sim/);
  assert.match(diamondHtml, /more of a TODO/);
  assert.match(scoopHtml, /\/2025\/10\/08\/l1-diamond-nitrogen-factory\.html/);
  assert.match(scoopHtml, /more of a TODO/);
  assert.match(stealthHtml, /https:\/\/alanse\.medium\.com\/the-inverted-hourglass-stealth-by-sunlight-pass-through-b649e6f85fc2/);
  assert.match(stealthHtml, /https:\/\/medium\.com\/@alanse\/stealth-by-a-long-tube-d0bad90368b9/);
  assert.match(stealthHtml, /https:\/\/github\.com\/AlanCoding\/hourglass-stealth/);
  assert.match(radiatorHtml, /https:\/\/github\.com\/AlanCoding\/cold_civ/);
});
