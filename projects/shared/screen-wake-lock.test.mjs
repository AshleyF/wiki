import assert from 'node:assert/strict';
import { createScreenWakeLock } from './screen-wake-lock.js';

class FakeDocument extends EventTarget {
  hidden = false;
  visibilityState = 'visible';
}

class FakeSentinel extends EventTarget {
  released = false;
  async release() {
    if (this.released) return;
    this.released = true;
    this.dispatchEvent(new Event('release'));
  }
}

const documentRef = new FakeDocument();
const sentinels = [];
const navigatorRef = {
  wakeLock: {
    async request(type) {
      assert.equal(type, 'screen');
      const sentinel = new FakeSentinel();
      sentinels.push(sentinel);
      return sentinel;
    }
  }
};

const lock = createScreenWakeLock({ documentRef, navigatorRef });
assert.equal(lock.supported, true);
assert.equal(await lock.setActive(true), true);
assert.equal(sentinels.length, 1);
assert.equal(await lock.acquire(), true);
assert.equal(sentinels.length, 1);

documentRef.hidden = true;
documentRef.visibilityState = 'hidden';
documentRef.dispatchEvent(new Event('visibilitychange'));
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(sentinels[0].released, true);

documentRef.hidden = false;
documentRef.visibilityState = 'visible';
documentRef.dispatchEvent(new Event('visibilitychange'));
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(sentinels.length, 2);
assert.equal(sentinels[1].released, false);

await lock.setActive(false);
assert.equal(sentinels[1].released, true);
await lock.dispose();

const unsupported = createScreenWakeLock({ documentRef, navigatorRef: {} });
assert.equal(unsupported.supported, false);
assert.equal(await unsupported.setActive(true), false);
await unsupported.dispose();

console.log('screen wake lock tests passed');
