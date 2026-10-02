// Domo's cross-origin iframe blocks the async Clipboard API via
// Permissions-Policy, so navigator.clipboard.writeText silently fails.
// execCommand('copy') is un-gated — intercept its trusted copy event and
// set clipboardData directly. A hidden, selected <textarea> is required
// because some browsers no-op execCommand('copy') without an active
// selection in the document.
export function copyText(text: string): boolean {
  let captured = false;
  const handler = (e: ClipboardEvent) => {
    e.clipboardData?.setData('text/plain', text);
    e.preventDefault();
    captured = true;
  };
  document.addEventListener('copy', handler);

  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.left = '0';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();

  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(ta);
    document.removeEventListener('copy', handler);
  }
  return captured;
}
