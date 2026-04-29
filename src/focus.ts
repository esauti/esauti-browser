import type { BrowserClientOptions, FocusOptions } from './types';
import { debugLog, normalizeBaseUrl } from './utils';

function scriptId(focusId: string): string {
  return `esauti-focus-${focusId}`;
}

export function enableFocus(
  opts: BrowserClientOptions,
  focus: FocusOptions
): () => void {
  const baseUrl = normalizeBaseUrl(opts.baseUrl);
  const src = `${baseUrl}/focus/${encodeURIComponent(focus.focusId)}.js`;

  // Avoid duplicates
  const existing = document.getElementById(scriptId(focus.focusId));
  if (!existing) {
    const s = document.createElement('script');
    s.id = scriptId(focus.focusId);
    s.src = src;
    s.async = true;
    s.defer = true;
    s.dataset.esautiFocus = focus.focusId;
    document.head.appendChild(s);
  } else {
    debugLog(opts.debug, 'Focus script already loaded', focus.focusId);
  }

  // Optionally refresh on SPA navigation by re-inserting script
  const onNav = () => refreshFocus(opts, focus.focusId);
  if (focus.autoRefreshOnSpa) {
    window.addEventListener('popstate', onNav);
  }

  return () => {
    if (focus.autoRefreshOnSpa) window.removeEventListener('popstate', onNav);
  };
}

export function refreshFocus(
  opts: BrowserClientOptions,
  focusId: string
): void {
  const el = document.getElementById(scriptId(focusId));
  if (!el) return;

  // re-trigger by cloning (simple, effective)
  const clone = el.cloneNode(true) as HTMLScriptElement;
  el.parentNode?.replaceChild(clone, el);
  debugLog(opts.debug, 'Focus refreshed', focusId);
}
