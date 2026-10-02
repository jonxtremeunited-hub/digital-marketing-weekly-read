// Thin shim over ryuu.js v6's Domo.codeEngine() for the Product API surface — endpoints
// the App Framework alias (`/domo/...` paths) does not cover. v6 handles transport and
// unwrap, so this file exists only to preserve the import surface (skills + customer
// code import `apiProxy` from this path; keep the symbol stable).
//
// For App Framework endpoints (`/domo/users/v1/currentUser`, AppDB, etc.) call
// `Domo.get`/`Domo.post` directly — see src/App.tsx for canonical examples.
//
// See code-engine/README.md for the CE function source (code-engine/code-engine-functions.js)
// and the manual UI-wiring step every published card needs.

import Domo from 'ryuu.js';

export interface ApiProxyOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  contentType?: string;
}

export function apiProxy<T = unknown>(opts: ApiProxyOptions): Promise<T> {
  return Domo.codeEngine<T>('apiProxy', {
    method: opts.method,
    path: opts.path,
    body: opts.body ? JSON.stringify(opts.body) : '',
    headers: opts.headers ? JSON.stringify(opts.headers) : '',
    contentType: opts.contentType ?? '',
  });
}
