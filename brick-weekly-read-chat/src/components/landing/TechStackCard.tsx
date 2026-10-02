import type { ReactNode } from 'react';

// Source of truth: pantry/scaffold/app/template/package.json + CLAUDE.md "Stack (locked)"
const ROWS: { name: string; purpose: ReactNode; where: string }[] = [
  { name: 'Vite 6', purpose: 'dev server + production build into dist/', where: 'vite.config.ts' },
  { name: 'React 18.3', purpose: 'UI framework', where: 'src/App.tsx, src/main.tsx' },
  {
    name: 'TypeScript 5.6',
    purpose: 'strict types + 6 extra flags catch silent bugs',
    where: 'tsconfig.json',
  },
  {
    name: 'Tailwind 3.4',
    purpose: 'utility CSS + pantry design tokens',
    where: 'tailwind.config.js, src/styles/globals.css',
  },
  {
    name: 'shadcn/ui',
    purpose: 'unstyled accessible primitives (Button, Card, Dialog…)',
    where: 'src/components/ui/',
  },
  {
    name: 'Redux Toolkit',
    purpose: 'shared client state across components',
    where: 'src/reducers/',
  },
  {
    name: 'TanStack Query',
    purpose: 'async state from Domo (datasets, AppDB, CE, AI)',
    where: 'src/lib/query-client.ts',
  },
  {
    name: 'ryuu.js v6',
    purpose: (
      <>
        Domo SDK — auth, dataset reads, Code Engine, AI
      </>
    ),
    where: 'imported as Domo everywhere',
  },
  {
    name: '@domoinc/toolkit',
    purpose: 'typed clients for AppDB, AI, Code Engine, Workflows',
    where: 'import per-feature',
  },
  {
    name: 'ryuu-proxy',
    purpose: 'dev-only Domo proxy middleware (Vite)',
    where: 'setupProxy.js',
  },
  {
    name: 'Vitest',
    purpose: 'test runner + Testing Library + happy-dom',
    where: 'vitest.config.ts',
  },
  {
    name: 'ESLint 9 + Prettier',
    purpose: 'lint (flat config) + format on save',
    where: 'eslint.config.mjs',
  },
];

export function TechStackCard() {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6">
      <h3 className="mb-4 text-sm font-semibold text-neutral-900">Tech stack</h3>

      {/* md+: 3-col grid */}
      <div className="hidden gap-x-6 gap-y-2.5 md:grid md:grid-cols-[minmax(140px,auto)_1fr_minmax(180px,auto)]">
        {ROWS.map(({ name, purpose, where }) => (
          <div key={name} className="contents">
            <div className="text-xs font-medium text-neutral-900">{name}</div>
            <div className="text-xs leading-relaxed text-neutral-500">{purpose}</div>
            <div className="font-mono text-xs text-neutral-700">{where}</div>
          </div>
        ))}
      </div>

      {/* <md: stacked rows */}
      <div className="space-y-3 md:hidden">
        {ROWS.map(({ name, purpose, where }, i) => (
          <div
            key={name}
            className={
              i === ROWS.length - 1
                ? 'space-y-1'
                : 'space-y-1 border-b border-neutral-100 pb-3'
            }
          >
            <div className="text-xs font-medium text-neutral-900">{name}</div>
            <div className="text-xs leading-relaxed text-neutral-500">{purpose}</div>
            <div className="font-mono text-xs text-neutral-700">{where}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
