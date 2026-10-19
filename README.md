# ChroMusic: AI Music Visualizer

A browser extension (Chrome, Manifest V3) that finds chord voicings, scales and harmonic structures in AI chat answers
and shows them on a guitar fretboard and a piano keyboard.

- `manifest.json`: the extension.
- `background/`, `content/`, `popup/`, `shared/`: its scripts.
- `AI_SYSTEM_PROMPT.md`: the prompt that asks the AI to answer in a form the extension can read.

## Try it

1. `npm install` (alphaTab, svguitar and pdf-parse).
2. Open `chrome://extensions`, turn on Developer mode, choose "Load unpacked" and pick this folder.

## Status

Published from the author's archive as is.

## Licence

MIT (see `LICENSE`).
