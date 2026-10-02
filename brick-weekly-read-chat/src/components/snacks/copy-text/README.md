# Copy-text snack

A `copyText()` helper and a `<CopyButton />` component that actually put
text on the clipboard from inside the Domo App Studio iframe.

## The problem

Domo Custom Apps run in a cross-origin iframe whose Permissions-Policy
blocks the async Clipboard API. `navigator.clipboard.writeText(...)`
silently fails — the copy button looks like it worked, but the paste
yields the previous clipboard contents.

`document.execCommand('copy')` is un-gated. Intercept its trusted `copy`
event to set `clipboardData` directly. A hidden, selected `<textarea>` is
required because some browsers no-op `execCommand('copy')` without an
active selection in the document.

## Usage

```tsx
import { CopyButton, copyText } from '@/components/snacks/copy-text';

// As a component (drop-in button)
<CopyButton text={prompt}>Copy kickoff prompt</CopyButton>

// Custom copied state label
<CopyButton text={email} copiedLabel="Copied · paste in Outlook">
  Copy email draft
</CopyButton>

// As a bare helper, from anywhere
<IconButton onClick={() => copyText(value)}>
  <ContentCopyIcon />
</IconButton>
```

`copyText(text)` returns `true` when the copy succeeded and `false` when
the browser blocked it — let consumers decide whether to flash a "Copied"
state or show an error.

## Files

- [`copy-text.ts`](copy-text.ts) — `copyText()` helper
- [`copy-button.tsx`](copy-button.tsx) — the `<CopyButton />` component
- [`index.ts`](index.ts) — barrel re-export

## What's deferred

- **Async/promise API.** `execCommand('copy')` is synchronous; we return
  a boolean. If we ever ship a clipboard fallback path that's async,
  promote to a `Promise<boolean>` then.
- **Polymorphism (`as="div"`, etc.).** Add when a project actually needs
  a non-`<button>` copy affordance.
- **Toast / aria-live announcement.** Consumers wire their own — copy
  feedback is design-system territory.
- **`navigator.clipboard.writeText` fallback for non-iframe contexts.**
  The `execCommand('copy')` path works everywhere we care about; adding
  the async path doubles the surface for no win today. Revisit if
  `execCommand` is removed (it's deprecated but still ships in all
  browsers as of 2026).
