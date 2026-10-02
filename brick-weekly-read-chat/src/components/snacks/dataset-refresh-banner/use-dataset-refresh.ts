import { useEffect, useRef, useState } from 'react';
import Domo from 'ryuu.js';

export interface DatasetRefreshEvent {
  alias: string;
  receivedAt: Date;
}

export interface UseDatasetRefreshOptions {
  aliases?: readonly string[] | undefined;
  debounceMs?: number | undefined;
}

export interface UseDatasetRefreshResult {
  event: DatasetRefreshEvent | null;
  dismiss: () => void;
  reload: () => void;
}

// `Domo.onDataUpdate` does three things in one call:
//   1. verifies the parent postMessage origin (only *.domo.com variants),
//   2. posts an `ack` back so App Studio doesn't hard-reload the iframe,
//   3. invokes the callback with the updated dataset alias.
// Subscribing — even with a no-op — is what suppresses the default reload.
// That's why this hook can never be conditionally skipped: if no component
// is subscribed, the iframe will reload on every dataset update.
export function useDatasetRefresh(
  options: UseDatasetRefreshOptions = {},
): UseDatasetRefreshResult {
  const { aliases, debounceMs = 500 } = options;
  const [event, setEvent] = useState<DatasetRefreshEvent | null>(null);
  const timerRef = useRef<number | null>(null);
  const aliasesRef = useRef(aliases);
  aliasesRef.current = aliases;

  useEffect(() => {
    const unsubscribe = Domo.onDataUpdate((alias: string) => {
      const allowed = aliasesRef.current;
      if (allowed && !allowed.includes(alias)) return;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setEvent({ alias, receivedAt: new Date() });
      }, debounceMs);
    });
    return () => {
      unsubscribe();
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [debounceMs]);

  return {
    event,
    dismiss: () => setEvent(null),
    reload: () => window.location.reload(),
  };
}
