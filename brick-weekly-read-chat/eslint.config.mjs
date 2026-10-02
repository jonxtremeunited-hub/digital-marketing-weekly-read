// ESLint 9 flat config. Inlined from fde/scaffold/_shared/eslint.config.base.mjs
// at scaffold copy time so the generated project is self-contained and doesn't
// reach back to the workspace.
//
// To diverge from the team default, edit here and document why. To upgrade the
// team default, edit _shared/eslint.config.base.mjs and propagate via fresh
// scaffold instantiation (no automated propagation today).
//
// ESLint owns correctness; Prettier owns formatting. eslint-config-prettier
// (loaded last) silences any rule that would conflict with Prettier output.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    // code-engine/code-engine-functions.js is the source uploaded to Domo Code
    // Engine UI separately — it's not bundled and not part of this app's runtime.
    // Skip linting; it's deliberately CommonJS / Domo-CE-runtime shaped.
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'code-engine/code-engine-functions.js',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Correctness — non-negotiable
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // Deterministic import ordering — auto-fixable via `pnpm lint --fix`.
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      // UI stack lock-in: Tailwind + shadcn/ui is the only allowed component
      // surface. See alignment.md §3.5 for the rationale. Migration projects
      // mid-port can disable per-file via `// eslint-disable-next-line
      // no-restricted-imports` with a comment naming the migration phase.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@mui/*'], message: 'Pantry uses Tailwind + shadcn/ui. See alignment.md §3.5.' },
            { group: ['@emotion/*'], message: 'Pantry uses Tailwind + shadcn/ui. CSS-in-JS not allowed.' },
            { group: ['@chakra-ui/*'], message: 'Pantry uses Tailwind + shadcn/ui.' },
            { group: ['antd', 'antd/*'], message: 'Pantry uses Tailwind + shadcn/ui.' },
            { group: ['styled-components'], message: 'Pantry uses Tailwind + shadcn/ui. CSS-in-JS not allowed.' },
            { group: ['@mantine/*'], message: 'Pantry uses Tailwind + shadcn/ui.' },
          ],
        },
      ],

      // Style nudges — warn, not block
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },

  // Scripts (.mjs / .js) — relax the type-aware rules; they don't need a tsconfig.
  // Run in Node, so node globals.
  {
    files: ['**/*.{mjs,js}'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Tests — allow non-null assertions and looser typing.
  {
    files: ['**/*.test.{ts,tsx}', '**/test-setup.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },

  // Must come last — disables formatting rules that fight Prettier.
  prettier,
);
