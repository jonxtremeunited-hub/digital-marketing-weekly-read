import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { DatasetRefreshEvent } from '../snacks/dataset-refresh-banner/use-dataset-refresh';

function seed(): DatasetRefreshEvent {
  return { alias: 'opportunities', receivedAt: new Date() };
}

interface DemoDatasetRefreshBannerProps {
  className?: string;
}

// Demo-only variant of `<DatasetRefreshBanner />`. Owns its own seeded state
// instead of calling `useDatasetRefresh()` so the gallery page doesn't
// double-subscribe `Domo.onDataUpdate` (the real one is wired elsewhere, or
// will be once any consumer needs it). `dismiss` clears + re-seeds after 2s
// so the demo stays visible. `role="presentation"` instead of `role="status"`
// because this is a showcase, not a live alert.
export function DemoDatasetRefreshBanner({ className }: DemoDatasetRefreshBannerProps) {
  const [event, setEvent] = useState<DatasetRefreshEvent | null>(seed);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const reseedSoon = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setEvent(seed());
      timerRef.current = null;
    }, 2000);
  };

  const dismiss = () => {
    setEvent(null);
    reseedSoon();
  };

  const reload = () => {
    setEvent(null);
    reseedSoon();
  };

  if (!event) {
    return (
      <div
        role="presentation"
        className={cn(
          'flex items-center justify-between gap-3 rounded-md border border-dashed border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-400',
          className,
        )}
      >
        <span>Banner dismissed — re-appearing…</span>
      </div>
    );
  }

  return (
    <div
      role="presentation"
      className={cn(
        'flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm transition-colors duration-150',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden />
        <span className="font-medium text-neutral-900">Fresh data is available</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={dismiss}
          className="text-neutral-500 hover:text-neutral-900"
        >
          Dismiss
        </Button>
        <Button size="sm" onClick={reload}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
