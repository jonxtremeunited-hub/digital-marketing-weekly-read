import { useQuery } from '@tanstack/react-query';
import Domo from 'ryuu.js';

export interface DomoUser {
  id: string;
  displayName: string;
  firstName: string;
  email: string;
  initials: string;
  title: string | null;
  role: string | null;
}

// `/domo/users/v1/{userId}` returns the enrichment fields (title, role).
// The other fields are synchronously available on `Domo.env` (from iframe
// query params), so we never block render on the network.
interface RawDomoUser {
  id?: string | number;
  displayName?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  emailAddress?: string;
  title?: string;
  jobTitle?: string;
  role?: string;
  roleId?: string;
}

export function useCurrentUser() {
  return useQuery<DomoUser>({
    queryKey: ['snacks', 'current-user'],
    queryFn: fetchCurrentUser,
    staleTime: Infinity,
    retry: false,
  });
}

async function fetchCurrentUser(): Promise<DomoUser> {
  const base = fromEnv();

  // Without a numeric userId we can't enrich; return the env-only record.
  // (Common in local dev outside the iframe — Domo.env stays empty there.)
  if (!base.id) return synthetic();

  const raw = await tryGet<RawDomoUser>(`/domo/users/v1/${base.id}`);
  if (!raw) return base;

  const displayName = raw.displayName ?? raw.fullName ?? composedName(raw) ?? base.displayName;
  return {
    ...base,
    displayName,
    firstName: raw.firstName ?? firstNameOf(displayName),
    email: raw.email ?? raw.emailAddress ?? base.email,
    title: raw.title ?? raw.jobTitle ?? null,
    role: raw.role ?? raw.roleId ?? null,
    initials: initialsOf(displayName),
  };
}

function fromEnv(): DomoUser {
  // Domo.env is populated synchronously from iframe query params in ryuu v6.
  // userId / userName / userEmail are the three guaranteed fields.
  const env = Domo.env;
  const id = String(env?.userId ?? '');
  const displayName = String(env?.userName ?? '') || (id ? `User ${id}` : 'You');
  const email = String(env?.userEmail ?? '');
  return {
    id,
    displayName,
    firstName: firstNameOf(displayName),
    email,
    initials: initialsOf(displayName),
    title: null,
    role: null,
  };
}

async function tryGet<T>(path: string): Promise<T | null> {
  try {
    return await Domo.get<T>(path);
  } catch {
    return null;
  }
}

function synthetic(): DomoUser {
  return {
    id: '',
    displayName: 'You',
    firstName: 'You',
    email: '',
    initials: 'YO',
    title: null,
    role: null,
  };
}

function composedName(raw: RawDomoUser): string | null {
  const composed = [raw.firstName, raw.lastName].filter(Boolean).join(' ');
  return composed || null;
}

function firstNameOf(displayName: string): string {
  const first = displayName.split(' ')[0];
  return first ?? displayName;
}

function initialsOf(displayName: string): string {
  const parts = displayName.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
