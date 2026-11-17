// Monopoli Desa Seblak — best-game-01 entry program (Node 22, stdlib only).
// Hands the game in: copies this repo's game/ and screenshots/ beside this
// file into the output directory and writes dossier.json with the vendored
// make.fun library, so the sealed scorer can check and the judge can read it.
//
//   node serve.ts            # play locally at http://localhost:8080
//   MAKEFUN_OUTPUT_DIR=out node main.ts   # write out/ the way the grader does
//
// Outside the grader MAKEFUN_OUTPUT_DIR stands in for /output. The program
// runs twice and both runs must write identical bytes, so it copies files
// verbatim and lets buildDossier do all the summarising.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');

if (!existsSync(gameDir)) {
  throw new Error('game/ is missing from the repository root');
}
if (!existsSync(join(gameDir, 'index.html'))) {
  throw new Error('game/index.html is missing — the entry has no game to hand in');
}

mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
}

// Gate caps from the competition rules: game/ at most 993 files and
// 48 MiB, index.html at most 1 MiB, 4 screenshots at most 256 KiB each,
// dossier.json at most 1.5 MiB of source text (160 KiB cap below).
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
