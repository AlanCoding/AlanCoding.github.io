import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const projectDir = path.resolve('projects/castle-ledger');
const gamePath = path.join(projectDir, 'game.js');
const promptsDir = path.join(projectDir, 'assets', 'prompts');
const outputDir = path.join(projectDir, 'assets', 'final-prompts');

function createStubElement() {
  return {
    hidden: false,
    textContent: '',
    innerHTML: '',
    src: '',
    alt: '',
    appendChild() {},
    addEventListener() {},
    removeAttribute() {},
  };
}

function createContext() {
  const elements = new Map();
  const document = {
    cookie: '',
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, createStubElement());
      }
      return elements.get(id);
    },
    createElement() {
      return createStubElement();
    },
  };
  const context = {
    console,
    document,
    structuredClone,
    globalThis: null,
  };
  context.globalThis = context;
  return context;
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function formatDescription(description) {
  if (Array.isArray(description)) {
    return description.map(entry => normalizeWhitespace(entry)).join(' ');
  }
  return typeof description === 'string' ? normalizeWhitespace(description) : '';
}

function visibleOptions(options) {
  if (!Array.isArray(options)) {
    return [];
  }
  return options
    .filter(option => !option.hidden && option.label)
    .map(option => normalizeWhitespace(option.label));
}

function extractSection(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`## ${escaped}\\n([\\s\\S]*?)(?:\\n## |$)`);
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

function parseBulletValue(section, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`- ${escaped}:\\s*(.+)`);
  const match = section.match(regex);
  return match ? normalizeWhitespace(match[1]) : '';
}

function splitGameplayOptions(optionLabels) {
  const routeVerbs = /^(Continue|Return|Head|Walk|Proceed|Circle|Approach|Cross|Climb|Ascend|Wade|Follow|Leave|Turn aside|Slip back out|Step into|Step through|Step aside|Step beneath|Enter|Visit|Detour|Proceed west|Proceed south|Proceed north|Proceed east)\b/i;
  const routeHints = [];
  const actionHints = [];

  for (const label of optionLabels) {
    if (routeVerbs.test(label)) {
      routeHints.push(label);
    } else {
      actionHints.push(label);
    }
  }

  return { routeHints, actionHints };
}

function formatGameplayCueList(items) {
  return items.map(item => `"${item}"`).join('; ');
}

function buildGameplayDirection(optionLabels) {
  if (!optionLabels.length) {
    return '';
  }

  const { routeHints, actionHints } = splitGameplayOptions(optionLabels);
  const parts = [];

  if (routeHints.length) {
    parts.push(
      `Show readable spatial hints about adjacent routes and exits so a player could intuit where paths lead next, visually suggesting these routes without any text signage or UI: ${formatGameplayCueList(routeHints)}.`
    );
  }

  if (actionHints.length) {
    parts.push(
      `Stage props, body language, or active vignettes that hint at the room's interactable actions and opportunities, visually suggesting these possible actions without literal text: ${formatGameplayCueList(actionHints)}.`
    );
  }

  parts.push(
    'Keep these gameplay hints subtle but legible at a glance, so the image helps the player anticipate navigation choices and useful interactions.'
  );

  return parts.join(' ');
}

async function loadGameExports() {
  const source = await fs.readFile(gamePath, 'utf8');
  const instrumented = source.replace(
    '  const state = loadState();',
    '  globalThis.__castleLedgerExport = { DEFAULT_STATE, ROOMS, cloneState };\n\n  const state = loadState();'
  );
  const context = createContext();
  vm.runInNewContext(instrumented, context, { filename: gamePath });
  if (!context.__castleLedgerExport) {
    throw new Error('Failed to load Castle Ledger room exports from game.js');
  }
  return context.__castleLedgerExport;
}

function buildPrompt(roomKey, promptText, snapshot) {
  const templateSection = extractSection(promptText, 'Castle Ledger Illustration Prompt Template');
  const locationSection = extractSection(promptText, 'Location-Specific Direction');

  const basePrompt = normalizeWhitespace(
    templateSection
      .replace(/^Use the following structure for every generated image:\s*/m, '')
      .replace(/\*\*Base Prompt\*\*/g, '')
      .replace(/\*\*Rendering Guidance\*\*/g, 'Rendering guidance:')
      .replace(/- /g, '')
  );

  const composition = parseBulletValue(locationSection, 'Composition');
  const keyElements = parseBulletValue(locationSection, 'Key elements');
  const characterFocus = parseBulletValue(locationSection, 'Character focus');
  const narrativeCues = parseBulletValue(locationSection, 'Narrative cues');
  const storyCues = parseBulletValue(locationSection, 'Story cues');
  const atmosphere = parseBulletValue(locationSection, 'Atmosphere');
  const description = formatDescription(snapshot.description);
  const optionLabels = visibleOptions(snapshot.options);
  const gameplayDirection = buildGameplayDirection(optionLabels);

  const parts = [
    `Create an image of "${snapshot.title}" for Castle Ledger: Chronicle of Beldane Keep.`,
    basePrompt,
    snapshot.meta ? `Setting: ${snapshot.meta}.` : '',
    composition ? `Composition: ${composition}` : '',
    keyElements ? `Key elements: ${keyElements}` : '',
    characterFocus ? `Character focus: ${characterFocus}` : '',
    narrativeCues ? `Narrative cues: ${narrativeCues}` : '',
    storyCues ? `Story cues: ${storyCues}` : '',
    atmosphere ? `Atmosphere: ${atmosphere}` : '',
    snapshot.illustrationAlt ? `Alt-text intent: ${normalizeWhitespace(snapshot.illustrationAlt)}` : '',
    snapshot.illustrationCaption ? `Caption intent: ${normalizeWhitespace(snapshot.illustrationCaption)}` : '',
    description ? `Scene context from the game: ${description}` : '',
    gameplayDirection ? `Gameplay-facing visual hints: ${gameplayDirection}` : '',
    'Output a single finished image only, with no text, watermark, border, UI, or split-panel layout.',
  ];

  return parts.filter(Boolean).join('\n\n');
}

async function main() {
  const exports = await loadGameExports();
  const state = exports.cloneState(exports.DEFAULT_STATE);
  const promptFiles = (await fs.readdir(promptsDir))
    .filter(name => name.endsWith('.prompt') && name !== 'TEMPLATE.prompt')
    .sort();

  await fs.mkdir(outputDir, { recursive: true });

  for (const fileName of promptFiles) {
    const roomKey = path.basename(fileName, '.prompt');
    const room = exports.ROOMS[roomKey];
    if (!room) {
      console.warn(`Skipping ${fileName}: no matching room in game.js`);
      continue;
    }

    const snapshot = room(state);
    const promptText = await fs.readFile(path.join(promptsDir, fileName), 'utf8');
    const finalPrompt = buildPrompt(roomKey, promptText, snapshot);
    await fs.writeFile(path.join(outputDir, fileName), `${finalPrompt}\n`);
  }

  process.stdout.write(`Wrote ${promptFiles.length} final prompts to ${outputDir}\n`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
