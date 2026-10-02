# User-info snack

A `useCurrentUser()` hook and a `<CurrentUserChip />` for the logged-in
Domo user. Handles the awkward truth that Domo's user endpoints disagree
about field names and that none of them are reliably present.

## Usage

```tsx
import { CurrentUserChip, useCurrentUser } from '@/components/snacks/user-info';

// As a header chip
<header>
  <CurrentUserChip />
</header>

// As a hook, anywhere
function Greeting() {
  const { data: user } = useCurrentUser();
  if (!user) return null;
  return <p>Hey {user.firstName}</p>;
}
```

The hook returns a TanStack Query result. `data` is typed as `DomoUser`:

```ts
interface DomoUser {
  id: string;
  displayName: string;
  firstName: string;
  email: string;
  initials: string;     // for avatars / monograms
  title: string | null;
  role: string | null;
}
```

## Why the multi-endpoint fallback

Domo exposes two user endpoints inside the iframe:

1. `/domo/users/v1/{userId}` — the richer record (title, role), but only
   returns when `window.domo.env.userId` is set. That's not always the
   case in early dev or when the app isn't fully wired.
2. `/domo/users/v1/currentUser` — universal, thinner.

And the field names drift across endpoints, app surfaces, and SDK
versions (`email` vs `emailAddress` vs `detail.email`, `displayName` vs
`name` vs `fullName + firstName/lastName`). The hook tries the rich
endpoint, falls back to the universal one, and finally synthesizes a
`{ id: 'unknown', displayName: 'You' }` user so the UI doesn't crash
during local development outside the iframe.

## Files

- [`use-current-user.ts`](use-current-user.ts) — the hook + parsing
- [`current-user-chip.tsx`](current-user-chip.tsx) — the small display chip
- [`index.ts`](index.ts) — barrel re-export

## What's deferred

- **Other users.** Same shape, different endpoint
  (`/domo/users/v1/{otherUserId}`). Lift `parse` to take any id when
  someone needs it third.
- **Avatar images.** Domo returns `avatarKey` on some endpoints — wire
  it when a project actually needs avatars.
- **Caching across tabs.** TanStack Query's `staleTime: Infinity`
  already makes this a one-shot per session; persisted cache (e.g. via
  localStorage) is a one-line addition when needed.
