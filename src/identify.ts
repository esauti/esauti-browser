import type {BrowserClientOptions, Identity} from './types';
import {debugLog} from './utils';

export function identify(
  opts: BrowserClientOptions,
  identity: Identity,
  extra: Record<string, unknown> = {},
  debug?: boolean
): void {
  if (typeof window === 'undefined') return;
  if (typeof window.mt !== 'function') {
    debugLog(debug, 'mt() not available; skip identify');
    return;
  }

  if (!identity.email && !identity.phone && !identity.external_id) {
    debugLog(debug, 'identify called without identifiable attributes (email, phone or external_id); skipping.');
    return;
  }

  const attrs = {...identity, ...extra};

  try {
    window.mt('send', 'identify', attrs);
  } catch (e) {
    debugLog(debug, 'trackPageView error', e);
  }
}
