// Pre-publish manifest validation. Catches the common ways `domo publish` fails
// (missing fields, bad semver, .env not in manifest.ignore, etc.) before they
// hit the wire. Runs as part of `pnpm publish:domo`.
//
// See cookbooks/06-manifest-publish-card-ids/README.md for the full publish flow.

import fs from 'node:fs';
import path from 'node:path';

const MANIFEST = path.join(process.cwd(), 'public', 'manifest.json');

function fail(msg) {
  console.error(`[manifest] ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(MANIFEST)) {
  fail(`manifest not found at ${MANIFEST}`);
}

const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

if (!m.name) fail('manifest.name is required');
if (!m.version) fail('manifest.version is required');
if (!/^\d+\.\d+\.\d+(?:-[\w.]+)?$/.test(m.version)) {
  fail(`manifest.version "${m.version}" is not valid semver`);
}

const ignore = m.manifest?.ignore ?? m.ignore ?? [];
const required = ['.env', '.env.*', '.git', '.git/**'];
const missing = required.filter((p) => !ignore.includes(p));
if (missing.length > 0) {
  console.warn(`[manifest] WARNING: manifest.ignore should include: ${missing.join(', ')}`);
  console.warn('[manifest]   .env files are NOT excluded by default — they will ship.');
}

console.log(`[manifest] ${m.name} v${m.version} — ok`);
