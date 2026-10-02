import { Check, Copy } from 'lucide-react';
import { type ButtonHTMLAttributes, type ReactNode, useState } from 'react';

import { cn } from '@/lib/utils';

import { copyText } from './copy-text';

interface CopyButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  text: string;
  children?: ReactNode;
  copiedLabel?: ReactNode;
  resetMs?: number;
}

export function CopyButton({
  text,
  children = 'Copy',
  copiedLabel = 'Copied',
  resetMs = 1400,
  className,
  onClick,
  'aria-label': ariaLabel,
  ...rest
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      {...rest}
      aria-label={copied ? 'Copied' : (ariaLabel ?? 'Copy')}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-150 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        className,
      )}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (!copyText(text)) return;
        setCopied(true);
        window.setTimeout(() => setCopied(false), resetMs);
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span>{copied ? copiedLabel : children}</span>
    </button>
  );
}
