import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import tsconfigPaths from 'vite-tsconfig-paths';

import publicManifest from './public/manifest.json';
import { setupRyuuProxy } from './setupProxy';

interface AppManifest {
  name?: string;
  version?: string;
}
const manifest = publicManifest as AppManifest;
const appName = manifest.name ?? '_starter-demo';
const appVersion = manifest.version ?? '0.0.0';

// Domo apps are deployed as static bundles uploaded via `domo publish` from `dist/`.
// Load-bearing settings:
//
// 1. base: './' — Domo serves the bundle from a UUID-based path inside the iframe,
//    not the root. Asset URLs must be relative.
//
// 2. build.rollupOptions.output — chunked ESM with `manualChunks` vendor split.
//    The DomoApps official template ships this shape; we align (alignment.md §4).
//    Pre-2020 iframe quirks once required IIFE; modern Domo iframes load
//    <script type="module"> chunked output without issue. Vendor chunks
//    (react+react-dom, redux+react-redux) cache across deploys, so code-only
//    re-publishes re-download ~5 KB instead of the full ~230 KB.
//
// 3. define: { 'process.env.NODE_ENV': ..., 'process.env': '{}' } — @domoinc/toolkit
//    and ryuu.js reference process.env at build time. Without these defines, the
//    bundle crashes with `ReferenceError: process is not defined`. NODE_ENV must
//    be defined separately (not just under the empty {}) so React's prod/dev gate
//    flips correctly — without it, React always ships the dev bundle (~40 KB extra).
//
// Dev-only additions (do not affect production build):
// - ryuu-proxy middleware proxies /data/v*, /sql/v*, /dql/v*, /domo/.../v*, /api/*
//   to the customer's Domo instance via the local `domo login` session. See
//   setupProxy.js and cookbooks/0-starter/4-dev-server.md.
// - vite-plugin-checker overlays TypeScript + ESLint errors in the browser during
//   `pnpm dev`. Production builds still rely on `pnpm typecheck` + `pnpm lint`
//   gates running separately (the plugin is dev-time feedback, not a build gate).
// - envPrefix: 'DOMO_' + envDir: './.environment' — only env vars prefixed with
//   DOMO_ are exposed to the client bundle via import.meta.env, loaded from
//   .environment/{.env,.env.development,.env.production}.
//
// See code-engine/README.md for the apiProxy CE function the bundle calls into.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    checker({
      typescript: true,
      eslint: {
        useFlatConfig: true,
        lintCommand: 'eslint .',
        dev: { logLevel: ['error'] },
      },
    }),
    tsconfigPaths(),
    {
      name: 'html-transform',
      transformIndexHtml(html: string) {
        return html.replace(
          /<title>(.*?)<\/title>/,
          `<title>${appName}@${appVersion}</title>`,
        );
      },
    },
    {
      name: 'ryuu-proxy-middleware',
      configureServer: setupRyuuProxy,
    },
  ],
  base: './',
  envDir: './.environment',
  envPrefix: 'DOMO_',
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
    'process.env': '{}',
    DOMO_APP_NAME: JSON.stringify(appName),
    DOMO_APP_VERSION: JSON.stringify(appVersion),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks: {
          vendor: ['react', 'react-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
}));
