# `code-engine/`

Ships with [`code-engine-functions.js`](code-engine-functions.js) — the universal `apiProxy` + `webFetch` CE function source. The file uploads to the Domo Code Engine UI separately from `domo publish` (CE has its own deploy surface); the scaffold's `public/manifest.json` `ignore` array excludes `code-engine/**/*` so this directory never enters the bundle.

Extend here for engagements that need a **custom** CE function beyond `apiProxy` and `webFetch`.

## When you'd add files here

The `apiProxy` function covers ~90% of FDE engagements (any Product API call). Reach for a custom CE function when:

- **Heavy compute** — vector embedding, large-file parsing, anything expensive client-side
- **Third-party API auth** — OAuth refresh, request signing, anything needing server-side secrets
- **Cross-API orchestration** — one logical operation that maps to 5+ API calls and you want one round-trip

## Convention

When you do write one, add it as a named function alongside `apiProxy` + `webFetch` in [`code-engine-functions.js`](code-engine-functions.js) — keep them all in one file.

## How `apiProxy` works

One CE function, any Product API endpoint. The browser calls `domo.post('/domo/codeengine/v2/packages/apiProxy', { url, method, body })`; the CE function adds the auth header server-side and returns the JSON. This bypasses the iframe CORS restriction.

Manifest entry (already in `public/manifest.json`):

```json
"packageMapping": [
  { "id": "apiProxy", "alias": "apiProxy", "version": "1.0.0" }
]
```

UI wiring step (one-time per card after publish): open the card → edit settings → wiring tab → select the `apiProxy` package. Without this step the manifest declaration alone won't make the function invokable.

## Excluded from `domo publish`

`public/manifest.json`'s `ignore` array excludes `code-engine/**/*`. CE functions deploy via the Domo Code Engine UI (Workflows → Code Engine), not through `domo publish` — there's no CLI for CE deploy as of this scaffold's writing.
