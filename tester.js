function createTester() {
  'use strict';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var openIndexedDBReq;

  function generateString(length) {
    let result = ' ';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
  }
  function createDoc(docSize) {
    if (docSize == 6) {
      return {
        data: inspectionData()
      }
    }
    if (docSize) {
      return {
        data: generateString(1024 * 1024 * docSize)
      }
    }
    return {
      data: Math.random()
    };
  }
  function createDocs({ numDocs, docSize }) {
    var docs = new Array(numDocs);
    for (var i = 0; i < numDocs; i++) {
      docs[i] = createDoc(docSize);
    }
    return docs;
  }

  function localStorageTest(docs) {
    for (var i = 0; i < docs.length; i++) {
      localStorage['doc_' + i] = JSON.stringify(docs[i]);
    }
  }

  function idbTest(docs) {
    return Promise.resolve().then(function () {
      if (openIndexedDBReq) {
        // reuse the same event to avoid onblocked when deleting
        return openIndexedDBReq.result;
      }
      return new Promise(function (resolve, reject) {
        var req = openIndexedDBReq = indexedDB.open('test_idb', 1);
        req.onblocked = reject;
        req.onerror = reject;
        req.onupgradeneeded = function (e) {
          var db = e.target.result;
          db.createObjectStore('docs', { keyPath: 'id' });
        };
        req.onsuccess = function (e) {
          var db = e.target.result;
          resolve(db);
        };
      });
    }).then(function (db) {
      return new Promise(function (resolve, reject) {
        var txn = db.transaction('docs', 'readwrite');
        var oStore = txn.objectStore('docs');
        for (var i = 0; i < docs.length; i++) {
          var doc = docs[i];
          doc.id = 'doc_' + i;
          oStore.put(doc);
        }
        txn.oncomplete = resolve;
        txn.onerror = reject;
        txn.onblocked = reject;
      });
    });
  }


  function getTest(db) {
    var fun = _getTest(db);
    return test;
    function test({ numDocs, docSize }) {
      if (typeof numDocs === 'number') {
        var docs = createDocs({ numDocs, docSize });
        return fun(docs);
      } else {
        return fun(numDocs);
      }
    }
  }
  function _getTest(db) {
    switch (db) {
      case 'localStorage':
        return localStorageTest;
      case 'idb':
        return idbTest;
    }
  }

  function cleanup() {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    var promises = [
      new Promise(function (resolve, reject) {
        if (typeof openDatabase === 'undefined') {
          return resolve();
        }
      }),
      new Promise(function (resolve, reject) {
        if (openIndexedDBReq) {
          openIndexedDBReq.result.close();
        }
        var req = indexedDB.deleteDatabase('test_idb');
        req.onsuccess = resolve;
        req.onerror = reject;
        req.onblocked = reject;
      }),
    ];

    return Promise.all(promises);
  }

  return {
    getTest: getTest,
    cleanup: cleanup,
    createDocs: createDocs
  }
}
