var test = require('tape');

var APIGateway = require('./api_gateway');
var putResource = require('..');

test("put() creates paths if it is not exists", function (t) {
  t.plan(3);

  var apiGateway = new APIGateway();
  putResource(
    apiGateway,
    {
      restApiId: 'xxx',
      path: [
        '/api-gateway/hello',
        '/hi/api'
      ],
    },
    function(err, data) {
      // check real data
      t.deepEqual(apiGateway.resources.map(function(item) { return item.path; }), ['/', '/hi', '/hi/api', '/api-gateway', '/api-gateway/hello']);
      // check return value
      t.deepEqual(data.items.map(function(item) { return item.path; }), ['/', '/hi', '/hi/api', '/api-gateway', '/api-gateway/hello']);
      t.deepEqual(data.deletedItems, []);
    }
  );
});

test("put() with deleteOthers deletes resources that is not given as paths", function (t) {
  t.plan(3);

  var apiGateway = new APIGateway();
  putResource(
    apiGateway,
    {
      restApiId: 'xxx',
      path: [
        '/api-gateway/hello',
        '/hi/api'
      ],
    },
    function() {
      putResource(
        apiGateway,
        {
          restApiId: 'xxx',
          path: [
            '/api-gateway',
          ],
          deleteOthers: true
        },
        function(_, data) {
          // check real data
          t.deepEqual(apiGateway.resources.map(function(item) { return item.path; }), ['/', '/api-gateway']);
          // check return value
          t.deepEqual(data.items.map(function(item) { return item.path; }), ['/', '/api-gateway']);
          t.deepEqual(data.deletedItems.map(function(item) { return item.path; }), ['/hi', '/hi/api', '/api-gateway/hello']);
        }
      );
    }
  );
});
