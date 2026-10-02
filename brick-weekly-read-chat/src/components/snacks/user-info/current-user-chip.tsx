import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { useCurrentUser } from './use-current-user';

interface CurrentUserChipProps {
  className?: string;
}

export function CurrentUserChip({ className }: CurrentUserChipProps) {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading || !user) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-full border border-neutral-200 px-1 py-1 pr-3',
          className,
        )}
      >
        <div className="h-6 w-6 animate-pulse rounded-full bg-neutral-100" />
        <div className="h-3 w-16 animate-pulse rounded bg-neutral-100" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-2 rounded-full border border-neutral-200 bg-white py-1 pl-1 pr-3 transition-colors duration-150 hover:border-neutral-300',
              className,
            )}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-semibold text-white">
              {user.initials}
            </span>
            <span className="text-xs font-medium text-neutral-900">{user.firstName}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-neutral-900">{user.displayName}</span>
            {user.email && <span className="font-mono text-[11px] text-neutral-500">{user.email}</span>}
            {user.title && <span className="text-[11px] text-neutral-500">{user.title}</span>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
