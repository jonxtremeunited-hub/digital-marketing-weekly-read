import { ArrowUp } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';

import { cn } from '@/lib/utils';

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string | undefined;
  className?: string | undefined;
}

export function Composer({
  onSend,
  disabled = false,
  placeholder = 'Ask anything…',
  className,
}: ComposerProps) {
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div
      className={cn(
        'flex items-end gap-2 border-t border-neutral-200 bg-white px-3 py-3',
        className,
      )}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 resize-none rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-50"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!canSend}
        aria-label="Send message"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-white transition-colors duration-150 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-500"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </div>
  );
}
