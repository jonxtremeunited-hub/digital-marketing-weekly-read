# Smart-link snack

A `<SmartLink />` component and an `openLink()` helper that make plain
left-clicks on links actually open from inside the Domo App Studio iframe.

## The problem

The Domo iframe is sandboxed without `allow-popups`, so the browser
**hard-blocks** `window.open` from inside. Plain `<a target="_blank">`
left-clicks are silently dropped; only `cmd/ctrl-click` works because the
browser handles those itself before the iframe sees the event.

The fix is `Domo.navigate(url, newTab)` from ryuu.js — it `postMessage`s
the parent window, which is *outside* the sandbox and can open any URL.

## Usage

```tsx
import { SmartLink, openLink } from '@/components/snacks/smart-link';

// As a component (drop-in for <a>)
<SmartLink href="https://salesforce.com/lead/123">Open lead</SmartLink>

// Same-tab navigation (e.g. an in-app nav link)
<SmartLink href="https://domo.domo.com/page/42" newTab={false}>
  Go to page
</SmartLink>

// As a bare helper, from anywhere
<button onClick={() => openLink('https://salesforce.com/lead/123')}>
  Open
</button>
```

`<SmartLink>` accepts every `<a>` prop. It renders a real anchor so
right-click "Copy link", screen readers, and native cmd/shift/middle-click
behavior all keep working — `onClick` interception only kicks in for plain
left-click.

## Files

- [`open-link.ts`](open-link.ts) — `openLink()` + `isPlainLeftClick()`
- [`smart-link.tsx`](smart-link.tsx) — the `<SmartLink />` component
- [`index.ts`](index.ts) — barrel re-export

## What's deferred

- **Aux-button (middle-click).** The browser handles it natively and
  opens a new tab. Override only if a project needs middle-click to route
  through `Domo.navigate`.
- **Analytics / click tracking.** Wrap `openLink` in your own helper.
- **`as="button"` polymorphism.** Add when a project actually needs it.
