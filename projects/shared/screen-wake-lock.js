export function createScreenWakeLock({
  documentRef = globalThis.document,
  navigatorRef = globalThis.navigator
} = {}) {
  let active = false;
  let sentinel = null;
  let requestInFlight = null;
  let disposed = false;

  const visible = () => documentRef?.visibilityState !== 'hidden' && !documentRef?.hidden;

  async function release() {
    const current = sentinel;
    sentinel = null;
    if (!current || current.released) return;
    try { await current.release(); } catch (error) { /* The browser may already have released it. */ }
  }

  async function acquire() {
    if (disposed || !active || !visible() || !navigatorRef?.wakeLock?.request) return false;
    if (sentinel && !sentinel.released) return true;
    if (requestInFlight) return requestInFlight;

    requestInFlight = (async () => {
      try {
        const requested = await navigatorRef.wakeLock.request('screen');
        if (disposed || !active || !visible()) {
          try { await requested.release(); } catch (error) { /* Already released. */ }
          return false;
        }
        sentinel = requested;
        requested.addEventListener('release', () => {
          if (sentinel === requested) sentinel = null;
        }, { once: true });
        return true;
      } catch (error) {
        return false;
      } finally {
        requestInFlight = null;
      }
    })();
    return requestInFlight;
  }

  async function setActive(nextActive) {
    active = Boolean(nextActive);
    return active ? acquire() : release().then(() => false);
  }

  const retryIfActive = () => { if (active) void acquire(); };
  const handleVisibility = () => { if (visible()) retryIfActive(); else void release(); };
  documentRef?.addEventListener('visibilitychange', handleVisibility);
  documentRef?.addEventListener('pointerdown', retryIfActive, { capture: true });
  documentRef?.addEventListener('keydown', retryIfActive, { capture: true });

  return Object.freeze({
    get active() { return active; },
    get supported() { return Boolean(navigatorRef?.wakeLock?.request); },
    acquire,
    setActive,
    async dispose() {
      disposed = true;
      active = false;
      documentRef?.removeEventListener('visibilitychange', handleVisibility);
      documentRef?.removeEventListener('pointerdown', retryIfActive, { capture: true });
      documentRef?.removeEventListener('keydown', retryIfActive, { capture: true });
      await release();
    }
  });
}
