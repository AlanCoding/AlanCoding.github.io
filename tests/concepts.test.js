import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
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
  assert.match(html, /Space Concepts/);
  assert.match(html, /🧅🛞 Flow Dividers for Artificial Gravity in Air/);
  assert.match(html, /relevance and impact is the highest for the flow dividers/);
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

test('scoop page separates the cooled diver from the aerocycler using the supplied outline', async () => {
  const html = await readSiteFile('concepts/atmospheric-scoop-divers/index.html');
  assert.doesNotMatch(html, /<h2>Basic Idea<\/h2>/);
  const abep = html.indexOf('>ABEP</a>');
  const cooled = html.indexOf('<h2>Actively-Cooled Scoop Diver</h2>');
  const unknowns = html.indexOf('<h2>What I don\'t know</h2>');
  const transition = html.indexOf('While I am fairly sure');
  const aerocycler = html.indexOf('<h2 id="aerocycler">Aerocycler</h2>');
  assert.ok(abep >= 0 && abep < cooled && cooled < transition && transition < aerocycler && aerocycler < unknowns);
  const sections = [...html.matchAll(/<section\b[^>]*class="concept-page__section"[^>]*>([\s\S]*?)<\/section>/g)].map(match => match[1]);
  const designsBox = sections.find(section => section.includes('<h2>Actively-Cooled Scoop Diver</h2>'));
  const unknownsBox = sections.find(section => section.includes('<h2>What I don\'t know</h2>'));
  assert.ok(designsBox && unknownsBox);
  assert.match(designsBox, /<h2 id="aerocycler">Aerocycler<\/h2>/);
  assert.doesNotMatch(designsBox, /What I don't know/);
  assert.doesNotMatch(unknownsBox, /<h2[^>]*>Aerocycler<\/h2>/);
  assert.ok(sections.indexOf(unknownsBox) > sections.indexOf(designsBox));
  assert.match(html, /\/concepts\/polar-aerocycler\//);
  assert.match(html, /electromagnetic wings/);
  assert.match(html, /github\.com\/AlanCoding\/orbital-shape-sim\/tree\/devel\/docs\/aerocycler_27day/);
});

test('aerocycler is a standalone static page with all runtime assets and source-backed downloads', async () => {
  const base = 'concepts/polar-aerocycler';
  const html = await readSiteFile(`${base}/index.html`);
  assert.ok(html.startsWith('<!doctype html>'));
  assert.match(html, /27\.4413/);
  assert.match(html, /id="space"/);
  assert.match(html, /\/concepts\/atmospheric-scoop-divers\//);
  assert.match(html, /https:\/\/github\.com\/AlanCoding\/orbital-shape-sim\/tree\/devel\/docs\/aerocycler_27day/);
  assert.match(html, /raw\.githubusercontent\.com\/AlanCoding\/orbital-shape-sim\/devel\/docs\/aerocycler_27day\/data\/trajectory\.csv/);
  const attributes = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(match => match[1]);
  for (const url of attributes) {
    if (/^(?:https?:|#)/.test(url)) continue;
    await access(path.join(root, url.startsWith('/') ? url.slice(1) : `${base}/${url}`));
  }
  const files = await readdir(path.join(root, base), { recursive: true });
  assert.equal(files.filter(name => /\.(html|css|js|png|svg)$/.test(name)).length, 14);
});

test('aerocycler backlinks follow the concept hierarchy', async () => {
  const html = await readSiteFile('concepts/polar-aerocycler/index.html');
  const breadcrumb = html.match(/<nav class="breadcrumbs wrap" aria-label="Breadcrumb">([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(breadcrumb);
  const ancestors = [...breadcrumb.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map(match => [match[1], match[2]]);
  assert.deepEqual(ancestors, [
    ['/concepts/', 'Space Concepts'],
    ['/concepts/atmospheric-scoop-divers/', 'Atmospheric Scoop Divers'],
  ]);
  assert.match(breadcrumb, /aria-current="page">Polar Aerocycler/);
  const footer = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/)?.[1];
  assert.match(footer, /href="\/concepts\/atmospheric-scoop-divers\/"/);
  assert.match(footer, /href="\/concepts\/"/);
});
