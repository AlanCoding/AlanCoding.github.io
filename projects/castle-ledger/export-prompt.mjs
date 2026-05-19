import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const projectDir = path.resolve('projects/castle-ledger');
const gamePath = path.join(projectDir, 'game.js');
const promptsDir = path.join(projectDir, 'assets', 'prompts');

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

function formatDescription(description) {
  if (Array.isArray(description)) {
    return description.join('\n');
  }
  return typeof description === 'string' ? description : '';
}

function formatOptions(options) {
  if (!Array.isArray(options) || !options.length) {
    return '';
  }
  return options
    .filter(option => !option.hidden)
    .map(option => `- ${option.label}`)
    .join('\n');
}

async function loadGameExports() {
  const source = await fs.readFile(gamePath, 'utf8');
  const instrumented = source.replace(
    '  const state = loadState();',
    '  globalThis.__castleLedgerExport = { DEFAULT_STATE, ROOMS, cloneState, normalizeState };\n\n  const state = loadState();'
  );
  const context = createContext();
  vm.runInNewContext(instrumented, context, { filename: gamePath });
  if (!context.__castleLedgerExport) {
    throw new Error('Failed to load Castle Ledger room exports from game.js');
  }
  return context.__castleLedgerExport;
}

async function main() {
  const roomKey = process.argv[2] || 'south_road';
  const exports = await loadGameExports();
  const state = exports.cloneState(exports.DEFAULT_STATE);
  const room = exports.ROOMS[roomKey];

  if (!room) {
    throw new Error(`Unknown room key: ${roomKey}`);
  }

  const snapshot = room(state);
  const promptPath = path.join(promptsDir, `${roomKey}.prompt`);
  const promptText = await fs.readFile(promptPath, 'utf8');
  const description = formatDescription(snapshot.description);
  const options = formatOptions(snapshot.options);

  const composed = [
    promptText.trimEnd(),
    '',
    '## Scene Snapshot Extracted From Game',
    `- Room key: ${roomKey}`,
    `- Title: ${snapshot.title || ''}`,
    `- Meta: ${snapshot.meta || ''}`,
    snapshot.illustrationAlt ? `- Illustration alt: ${snapshot.illustrationAlt}` : '',
    snapshot.illustrationCaption ? `- Illustration caption: ${snapshot.illustrationCaption}` : '',
    description ? `- Description:\n${description}` : '',
    options ? `- Available actions:\n${options}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  process.stdout.write(`${composed}\n`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
