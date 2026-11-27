// Gobble Run — The Great Thanksgiving Getaway: the hand-in program for
// make.fun's turkey-run-game-01 (Node 22, standard library only).
//
// The game itself is the game/ folder beside this file: plain static
// files (an index.html and its ES modules, no library, no network) that
// play offline in a desktop browser. Waddles the turkey auto-runs from
// the farmyard, through the pumpkin patch, past the farmhouse kitchen
// yard to the woods 1,200 metres away, while Farmer Brown — gap meter
// in the HUD — closes in every time the bird stumbles into an oven, a
// fence, a pitchfork, a set dinner table or a flying carving knife.
//
// This program copies game/ and screenshots/ into the output directory
// and writes dossier.json there with buildDossier from the vendored
// vendor/makefun-game.ts, which is the kit's library kept byte for byte
// so the dossier matches the one the scorer rebuilds. Serve the game
// locally with `node serve.ts` and open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for
// /output:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// One friendly line so a human running this by hand knows it worked.
console.log(`gobble-run: handed in the game and screenshots to ${out} (dossier.json written)`);
