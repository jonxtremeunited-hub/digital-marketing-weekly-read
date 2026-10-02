// Vite middleware that proxies real Domo API calls from the local dev server to
// the customer's instance via the user's active `domo login` session. Without
// this, `pnpm dev` against the iframe-only ryuu.js bridge would fall back to
// "no response" on every Domo call.
//
// Prereqs (see cookbooks/0-starter/4-dev-server.md):
//   1. `domo login` — seeds the session ryuu-proxy reads from Configstore.
//   2. `pnpm publish:domo` once — assigns `manifest.id` and writes it back via
//      the cookbook's `jq` step. The proxy refuses to start without a non-empty
//      `id` because the upstream session resolves apps by design UUID.
//
// What it intercepts (per ryuu-proxy README):
//   /data/v{d}, /sql/v{d}, /dql/v{d}, /domo/.../v{d}, /api/...
//
// DQL / writeback / OAuth need `manifest.proxyId`, auto-seeded by step 3.2 of
// cookbooks/0-starter/3-publish-to-domo.md. The middleware below logs an info
// line when it's missing so the degradation isn't silent.
//
// Why JS (with a .d.ts sidecar) instead of TS: ryuu-proxy's ProxyOptions
// resolves the manifest type to `any` (its .d.ts entry-point doesn't re-export
// the model), so the TS sugar buys nothing. Plain JS also sidesteps the
// `fileURLToPath(import.meta.url)` gymnastics needed for ESM __dirname. The
// .d.ts sidecar keeps the public surface typed for callers (vite.config.ts).

import { Proxy } from '@domoinc/ryuu-proxy';
import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');

export function setupRyuuProxy(server) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  if (!manifest.id) {
    server.config.logger.warn(
      '[ryuu-proxy] manifest.id is empty — proxy disabled. Run `pnpm publish:domo` once to seed the design id, then restart `pnpm dev`. See cookbooks/0-starter/4-dev-server.md.',
    );
    return;
  }

  if (!manifest.proxyId) {
    server.config.logger.info(
      '[ryuu-proxy] manifest.proxyId is empty — DQL / writeback / OAuth surfaces will not proxy. Re-run step 3.2 of cookbooks/0-starter/3-publish-to-domo.md, or see @domoinc/ryuu-proxy README for card-specific proxyIds.',
    );
  }

  const proxy = new Proxy({ manifest });

  server.middlewares.use((req, res, next) => {
    const streamPromise = proxy.stream(req);
    if (!streamPromise) {
      next();
      return;
    }
    streamPromise
      .then((upstream) => upstream.pipe(res))
      .catch((err) => {
        if (err && err.name === 'DomoException') {
          const status = err.status ?? err.statusCode ?? 500;
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({ error: 'DomoException', status, url: err.url, message: err.message }),
          );
          return;
        }
        next();
      });
  });
}
