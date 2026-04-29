import { debugLog } from './utils';

export type SpaPatchOptions = {
  onNavigate: () => void;
  debug?: boolean;
};

export function patchHistory(opts: SpaPatchOptions): () => void {
  const { onNavigate } = opts;

  const origPush = history.pushState;
  const origReplace = history.replaceState;

  const fire = () => {
    try {
      onNavigate();
    } catch (e) {
      debugLog(opts.debug, 'onNavigate error', e);
    }
  };

  history.pushState = function (...args: any[]) {
    // @ts-ignore
    const r = origPush.apply(this, args as any);
    fire();
    return r;
  } as any;

  history.replaceState = function (...args: any[]) {
    // @ts-ignore
    const r = origReplace.apply(this, args as any);
    fire();
    return r;
  } as any;

  window.addEventListener('popstate', fire);

  return () => {
    history.pushState = origPush;
    history.replaceState = origReplace;
    window.removeEventListener('popstate', fire);
  };
}
