# Dataset-refresh-banner snack

A `<DatasetRefreshBanner />` component and a `useDatasetRefresh()` hook that
surface "fresh data is available" inside the Domo App Studio iframe when an
underlying dataset finishes refreshing — without losing session state to a
full iframe reload.

## The problem

Domo App Studio's parent frame posts a `message` to your iframe whenever an
underlying dataset finishes refreshing. **If nothing in the iframe acknowledges
that message, App Studio hard-reloads the iframe.** That nukes Redux, TanStack
Query caches, the user's open chat, their filter selections — everything.

The fix is `Domo.onDataUpdate(cb)` from ryuu.js. Subscribing posts the `ack`
back to the parent so the reload doesn't happen, and hands you the alias of
the updated dataset. The "do nothing" form — `Domo.onDataUpdate(() => null)` —
is what most apps install at boot. This snack does the same suppression *and*
gives the user a way to opt into fresh data on their terms.

## Usage

```tsx
import { DatasetRefreshBanner } from '@/components/snacks/dataset-refresh-banner';

// Drop it once at the app root. Default behavior: shows banner, full reload.
<DatasetRefreshBanner />

// Filter to aliases you care about + invalidate TanStack Query instead of reloading.
const queryClient = useQueryClient();
<DatasetRefreshBanner
  aliases={['opportunities', 'milestones']}
  onRefresh={async () => {
    await queryClient.invalidateQueries();
  }}
/>
```

Or use the hook directly, e.g. to surface a custom UI:

```tsx
import { useDatasetRefresh } from '@/components/snacks/dataset-refresh-banner';

const { event, dismiss, reload } = useDatasetRefresh({ aliases: ['opportunities'] });
if (event) return <YourCustomBanner onAccept={reload} onDismiss={dismiss} />;
```

## Critical: keep something subscribed

The hook *must* stay mounted somewhere for the lifetime of the app. If no
component is subscribed, App Studio will reload the iframe on every dataset
update. Mount the banner once at the root — the same place you'd otherwise
put `Domo.onDataUpdate(() => null)`.

## Files

- [`use-dataset-refresh.ts`](use-dataset-refresh.ts) — the hook
- [`dataset-refresh-banner.tsx`](dataset-refresh-banner.tsx) — the UI
- [`index.ts`](index.ts) — barrel re-export

## What's deferred

- **Multi-alias display.** Banner shows the most recent alias; rapid bursts
  are debounced to 500ms. Add per-alias channels if a project actually needs
  them.
- **Time-since-update display.** Requires a ticking timer; add when a project
  asks for "refreshed 3m ago"-style copy.
- **Auto-refresh.** Always opt-in. Surprise reloads were the original problem.
- **Persistence across mounts.** Each mount starts fresh; that's fine for a
  root-level banner.
