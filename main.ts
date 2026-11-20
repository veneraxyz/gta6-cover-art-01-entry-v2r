// Vice Cover Studio — a gta6-cover-art-01 entry (Node 22, stdlib only).
//
// The program hands the app in: it copies this repo's app/ (the offline
// cover maker: index.html, ES modules, the bundled Anton font) and
// screenshots/ into the output directory, then writes dossier.json with
// make.fun's vendored library so the judge can read the entry.
//
// Local check:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Local try-out: node serve.ts, then open http://localhost:8080

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });

const shots = join(repoRoot, 'screenshots');
if (existsSync(shots)) {
  cpSync(shots, join(outDir, 'screenshots'), { recursive: true });
} else {
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
}

// Caps from the competition's gate (reference/gate.json): the dossier text is
// capped at 160 KiB; the rest refuse an entry the scorer would refuse.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
