import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { useDatasetRefresh } from './use-dataset-refresh';

interface DatasetRefreshBannerProps {
  aliases?: readonly string[];
  onRefresh?: (alias: string) => void | Promise<void>;
  className?: string;
}

export function DatasetRefreshBanner({
  aliases,
  onRefresh,
  className,
}: DatasetRefreshBannerProps) {
  const { event, dismiss, reload } = useDatasetRefresh({ aliases });
  const [refreshing, setRefreshing] = useState(false);

  if (!event) return null;

  const handleRefresh = async () => {
    if (!onRefresh) {
      reload();
      return;
    }
    setRefreshing(true);
    try {
      await onRefresh(event.alias);
      dismiss();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
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
          disabled={refreshing}
          className="text-neutral-500 hover:text-neutral-900"
        >
          Dismiss
        </Button>
        <Button size="sm" onClick={() => void handleRefresh()} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>
    </div>
  );
}
