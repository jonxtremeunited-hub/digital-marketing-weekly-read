import type { ReactNode } from 'react';

interface TreeRow {
  prefix: string;
  name: string;
  blurb: ReactNode;
}

// Source of truth: pantry/scaffold/app/template/
// Keep `src/App.tsx` as an exact substring — App.test.tsx asserts on it.
const ROWS: TreeRow[] = [
  { prefix: '', name: 'src/', blurb: 'app source — everything Vite bundles into dist/' },
  { prefix: '├── ', name: 'main.tsx', blurb: 'React entry; mounts Redux + QueryClientProvider' },
  { prefix: '├── ', name: 'src/App.tsx', blurb: 'you are here — wipe when you ship feature 1' },
  { prefix: '├── ', name: 'components/', blurb: 'all React components' },
  { prefix: '│   ├── ', name: 'landing/', blurb: 'this welcome page (delete with App.tsx)' },
  {
    prefix: '│   ├── ',
    name: 'snacks/',
    blurb: 'copy-and-tweak reference UI (chatbot, smart-link, user-info, …)',
  },
  {
    prefix: '│   └── ',
    name: 'ui/',
    blurb: (
      <>
        shadcn primitives — add more with{' '}
        <code className="font-mono text-neutral-700">pnpm dlx shadcn@latest add</code>
      </>
    ),
  },
  { prefix: '├── ', name: 'lib/', blurb: 'shared helpers (no React)' },
  { prefix: '│   ├── ', name: 'api-proxy.ts', blurb: 'single Code Engine shim for Product API calls' },
  {
    prefix: '│   ├── ',
    name: 'query-client.ts',
    blurb: 'TanStack Query config (staleTime 5min, retry 1)',
  },
  { prefix: '│   └── ', name: 'utils.ts', blurb: 'cn() helper + misc utilities' },
  { prefix: '├── ', name: 'reducers/', blurb: 'Redux Toolkit store — add slices here' },
  { prefix: '│   ├── ', name: 'index.ts', blurb: 'store + typed hooks' },
  { prefix: '│   └── ', name: 'ui/', blurb: 'theme slice + useThemeEffect' },
  { prefix: '└── ', name: 'styles/globals.css', blurb: 'Tailwind layers + pantry design tokens' },
  { prefix: '', name: '', blurb: '' },
  { prefix: '', name: 'public/', blurb: 'static assets copied verbatim into dist/' },
  {
    prefix: '└── ',
    name: 'manifest.json',
    blurb: (
      <>
        Domo app metadata; <code className="font-mono text-neutral-700">id</code> auto-seeded on
        first publish
      </>
    ),
  },
  { prefix: '', name: '', blurb: '' },
  {
    prefix: '',
    name: 'setupProxy.js',
    blurb: (
      <>
        dev-only ryuu-proxy middleware; needs{' '}
        <code className="font-mono text-neutral-700">domo login</code>
      </>
    ),
  },
  {
    prefix: '',
    name: 'vite.config.ts',
    blurb: (
      <>
        load-bearing: <code className="font-mono text-neutral-700">base: &apos;./&apos;</code> +
        vendor chunks + <code className="font-mono text-neutral-700">process.env</code> shim
      </>
    ),
  },
  { prefix: '', name: '.github/workflows/ci.yml', blurb: 'push to main → auto-deploy to Domo' },
  {
    prefix: '',
    name: 'code-engine/',
    blurb: 'apiProxy + webFetch source; upload to Domo CE UI (not bundled)',
  },
  { prefix: '', name: 'notebooks/', blurb: 'Python on Domo Automation (not bundled)' },
  { prefix: '', name: 'context/', blurb: 'engagement brief + instance survey (not bundled)' },
  { prefix: '', name: 'agent-docs/', blurb: 'design notes, research (not bundled)' },
];

export function FileStructureCard() {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6">
      <h3 className="mb-4 text-sm font-semibold text-neutral-900">File structure</h3>
      <div className="grid grid-cols-[minmax(260px,auto)_1fr] gap-x-6 gap-y-1.5">
        {ROWS.map(({ prefix, name, blurb }, i) => {
          if (!name) {
            return <div key={`spacer-${i}`} className="contents" aria-hidden="true">
              <div className="h-2" />
              <div className="h-2" />
            </div>;
          }
          return (
            <div key={`${prefix}${name}-${i}`} className="contents">
              <code className="whitespace-pre font-mono text-xs text-neutral-900">
                <span className="text-neutral-400">{prefix}</span>
                {name}
              </code>
              <div className="text-xs leading-relaxed text-neutral-500">{blurb}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
