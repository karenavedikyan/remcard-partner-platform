(function () {
  if (window.rcDemoMemory) {
    return;
  }
  var store = new Map();
  function seedReleaseFromQuery() {
    try {
      var u = new URL(window.location.href);
      var q = u.searchParams.get('rc_demo_release');
      if (q === '1' || q === '2') {
        store.set('rc_release', q);
      }
    } catch (e) {}
  }
  seedReleaseFromQuery();
  var memory = {
    getItem: function (key) {
      if (typeof key !== 'string') {
        key = String(key);
      }
      if (!store.has(key)) {
        return null;
      }
      var v = store.get(key);
      return typeof v === 'string' ? v : String(v);
    },
    setItem: function (key, value) {
      if (typeof key !== 'string') {
        key = String(key);
      }
      if (typeof value !== 'string') {
        value = String(value);
      }
      store.set(key, value);
    },
    removeItem: function (key) {
      if (typeof key !== 'string') {
        key = String(key);
      }
      store.delete(key);
    },
    clear: function () {
      store.clear();
    },
    key: function (index) {
      var i = Number(index);
      if (!Number.isFinite(i) || i < 0) {
        return null;
      }
      var n = 0;
      var k = null;
      store.forEach(function (_, key) {
        if (n === i) {
          k = key;
        }
        n += 1;
      });
      return k;
    }
  };
  Object.defineProperty(memory, 'length', {
    get: function () {
      return store.size;
    },
    enumerable: true,
    configurable: true
  });
  window.rcDemoMemory = memory;
})();
