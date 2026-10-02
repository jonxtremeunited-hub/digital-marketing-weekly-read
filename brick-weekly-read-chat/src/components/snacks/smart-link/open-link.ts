import type { MouseEvent } from 'react';
import Domo from 'ryuu.js';

// window.open is blocked by the Domo iframe sandbox (no allow-popups).
// Domo.navigate postMessages the parent, which is unsandboxed and can open
// any URL — internal Domo pages or external sites.
export function openLink(url: string, newTab = true): void {
  const inIframe = window.self !== window.top;
  if (inIframe && typeof Domo?.navigate === 'function') {
    Domo.navigate(url, newTab);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function isPlainLeftClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
