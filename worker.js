importScripts(
  'tester.js',
  'data.js',
);

var tester = createTester();

self.addEventListener('message', function (e) {
  var dbType = e.data.dbType;
  var numDocs = e.data.numDocs;
  var action = e.data.action;
  var docSize = e.data.docSize;

  if (action === 'cleanup') {
    return tester.cleanup().then(function () {
      self.postMessage({});
    }).catch(function (e) {
      console.error('worker error', e);
      self.postMessage({ error: e.message });
    });
  }

  var test = tester.getTest(dbType);

  Promise.resolve().then(function () {
    return test({ numDocs, docSize });
  }).then(function () {
    self.postMessage({ success: true });
  }).catch(function (e) {
    console.error('worker error', e);
    self.postMessage({ error: e.message });
  });
});
