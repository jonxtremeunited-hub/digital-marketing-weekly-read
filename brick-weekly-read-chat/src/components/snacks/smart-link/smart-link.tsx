import type { AnchorHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

import { isPlainLeftClick, openLink } from './open-link';

interface SmartLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  newTab?: boolean;
}

export function SmartLink({
  href,
  newTab = true,
  className,
  onClick,
  children,
  ...rest
}: SmartLinkProps) {
  return (
    <a
      {...rest}
      href={href}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      className={cn('underline-offset-2 hover:underline', className)}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || !isPlainLeftClick(e)) return;
        e.preventDefault();
        openLink(href, newTab);
      }}
    >
      {children}
    </a>
  );
}
