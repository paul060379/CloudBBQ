/* Local-only IndexedDB. Records have stable IDs for a future opt-in upload. */
window.PicnicStore = (() => {
  const dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('cloud-bbq-picnic', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const runs = db.createObjectStore('runs', {keyPath:'id'});
      runs.createIndex('player', 'player');
      db.createObjectStore('settings');
    };
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('indexeddb blocked by another tab'));
  });
  dbPromise.catch(() => {});
  async function operation(store, mode, action) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode); let result;
      const req = action(tx.objectStore(store));
      req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('indexeddb transaction aborted'));
    });
  }
  return {
    save: record => operation('runs', 'readwrite', s => s.put(record)),
    all: () => operation('runs', 'readonly', s => s.getAll()),
    preference: () => operation('settings', 'readonly', s => s.get('player')),
    setPreference: player => operation('settings', 'readwrite', s => s.put(player, 'player'))
  };
})();
