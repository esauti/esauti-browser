# @esauti/browser

Browser SDK for **eSauti** focused on:

- Consent-gated tracking loader (loads `mtc.js` only when allowed)
- SPA page tracking helpers
- Form embedding (`/form/{id}`) and Focus embedding (`/focus/{id}.js`)

This package is **browser-only**. For backend/server integrations, keep a separate SDK package (Node/Python/PHP).

## Install

```bash
npm i @esauti/browser
```

## Quick start (vanilla / Vite)

```ts
import { createBrowserClient } from '@esauti/browser';

const esauti = createBrowserClient({
  baseUrl: 'https://tenant.esauti.com',
  token: 'YOUR_INTEGRATION_TOKEN', // optional (recommended for authenticated ingest)
  source: 'web',
  enableSpaAutoTracking: true, // auto track SPA navigation
  shouldSendEvent: (evt) => true, // optional hook for consent enforcement
});

await esauti.init();

// When user gives consent:
await window.esauti_start_tracking?.();
```

## Tracking modes

### Standard mode

- Loads tracker immediately on init.
- Sends initial pageview.

```ts
createBrowserClient({ baseUrl, consentMode: 'standard' });
```

### Consent-gated mode (recommended for Law 25 / GDPR)

- Does NOT load tracker automatically.
- Exposes `window.esauti_start_tracking()` to start tracking after consent.

```ts
createBrowserClient({ baseUrl, consentMode: 'gated' });
```

## Forms

Simple iframe embed (reliable across frameworks):

```ts
const cleanup = esauti.forms.mount(document.getElementById('form')!, {
  formId: '123',
  height: 720,
  width: '100%',
});

// later
cleanup();
```

The embed URL is: `{baseUrl}/form/{id}`.

## Focus

```ts
const stop = esauti.focus.enable({ focusId: '42', autoRefreshOnSpa: true });

// If you need to refresh manually:
esauti.focus.refresh('42');

stop();
```

Focus loads: `{baseUrl}/focus/{id}.js`.

## Identify (link app user -> tracked visitor)

If you implement an eSauti identify endpoint (recommended):

```ts
await esauti.identify({
  external_id: 'user_123',
  email: 'optional@example.com',
});
```

## API Reference (high level)

- `createBrowserClient(options)`
- `client.init()`
- `client.loadTracker()`
- `client.startTracking(extraAttrs?)`
- `client.trackPage(attrs?)`
- `client.forms.mount(el, {formId,...})`
- `client.focus.enable({focusId,...})`
- `client.identify(identity, extra?)`

## Build

```bash
npm run build
```

---

MIT License
