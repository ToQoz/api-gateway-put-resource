var test = require('tape');

var APIGateway = require('./api_gateway');
var putResource = require('..');

test("put() creates paths if it is not exists", function (t) {
  t.plan(8);

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

      // check operations
      t.equal(data.operations.length, 4);
      t.deepEqual(data.operations[0].message, 'apiGateway: create resource /hi');
      t.deepEqual(data.operations[1].message, 'apiGateway: create resource /hi/api');
      t.deepEqual(data.operations[2].message, 'apiGateway: create resource /api-gateway');
      t.deepEqual(data.operations[3].message, 'apiGateway: create resource /api-gateway/hello');
    }
  );
});

test("put() with deleteOthers deletes resources that is not given as paths", function (t) {
  t.plan(7);

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

          // check operations
          t.equal(data.operations.length, 3);
          t.deepEqual(data.operations[0].message, 'apiGateway: delete resource /hi');
          t.deepEqual(data.operations[1].message, 'apiGateway: delete resource /hi/api');
          t.deepEqual(data.operations[2].message, 'apiGateway: delete resource /api-gateway/hello');
        }
      );
    }
  );
});
