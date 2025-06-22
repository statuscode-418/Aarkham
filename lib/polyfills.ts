// Polyfill for indexedDB during SSR
if (typeof window === 'undefined' && typeof global !== 'undefined') {
  // Mock indexedDB for server-side rendering
  (global as any).indexedDB = {
    open: () => ({
      onsuccess: () => {},
      onerror: () => {},
      result: {
        transaction: () => ({
          objectStore: () => ({
            add: () => {},
            get: () => ({
              onsuccess: () => {},
              onerror: () => {},
            }),
            put: () => {},
            delete: () => {},
          }),
        }),
        createObjectStore: () => {},
      },
    }),
    deleteDatabase: () => {},
  };

  // Mock other browser APIs that might be needed
  (global as any).IDBKeyRange = {
    only: () => {},
    bound: () => {},
    upperBound: () => {},
    lowerBound: () => {},
  };

  (global as any).localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  };

  (global as any).sessionStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  };
}
