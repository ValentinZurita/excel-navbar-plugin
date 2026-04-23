import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

/**
 * Node may expose a partial `localStorage` when webstorage CLI flags are mis-set,
 * which breaks persistence tests that rely on the full Storage API.
 */
function installInMemoryLocalStorage() {
  const store = new Map<string, string>();
  const api: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: api,
    configurable: true,
    writable: true,
  });
}

const ls = globalThis.localStorage;
const localStorageBroken =
  !ls ||
  typeof ls.clear !== 'function' ||
  typeof ls.setItem !== 'function' ||
  typeof ls.getItem !== 'function';

if (localStorageBroken) {
  installInMemoryLocalStorage();
}
