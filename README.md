# api-gateway-put-resource

creates (or deletes) AWS API Gateway's resource if it doesn't exist.

## Usage

example.js:

```javascript
var AWS = require('aws-sdk');
var credentials = new AWS.SharedIniFileCredentials({
  profile: 'org-stuff'
});
AWS.config.credentials = credentials;

var putResource = require('api-gateway-put-resource');

putResource(
  new AWS.APIGateway({
    region: 'ap-northeast-1'
  }),
  {
    restApiId: 'xxxxx', // Your restApiId
    deleteOthers: true, // Set true if you want to delete all resources that is not in path
    path: [
      '/api-gateway',
      '/hi/api'
    ],
  },
  function(err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log(data);
    }
  }
);

```
$ node ./example.js
{
  "items": [
    {
      "id": "x",
      "path": "/",
      "resourceMethods": {
        "GET": {}
      }
    },
    {
      "id": "y",
      "parentId": "x",
      "pathPart": "hi",
      "path": "/hi"
    },
    {
      "id": "z",
      "parentId": "x",
      "pathPart": "api-gateway",
      "path": "/api-gateway"
    }
  ],
  "deletedItems": [],
  "operations": [
    {
      "op": "apiGateway.createResource",
      "params": {
        "restApiId": "xxx",
        "parentId": "x",
        "pathPart": "hi"
      },
      "message": "apiGateway: create resource /hi"
    },
    {
      "op": "apiGateway.createResource",
      "params": {
        "restApiId": "xxx",
        "parentId": "x",
        "pathPart": "api-gateway"
      },
      "message": "apiGateway: create resource /api-gateway"
    }
  ]
}
```

## API

```javascript
var putResource = require('api-gateway-put-resource')
```

### putFunction(apiGateway, params, cb)

This function creates (or deletes) AWS API Gateway's resource if it doesn't exist.

- Arguments
  - apiGateway - **required** - `instance of AWS.APIGateway`
  - params - **required** - `map`
    - path - **required** - `Array<String> | String`
    - deleteOthers: - defaults to false - `Boolean`
  - cb - `function(err, data) {}` - called with following arguments on the end of operation
    - Arguments (cb)
      - err - `Error` - the error object from aws-sdk. Set to `null` if the operation is successful.
      - data - `map` - the data from aws-sdk. Set to `null` if the operation error occur.
        - items - `Array<map>` - the resources that are targets of the operation
          - id - `String`
          - parentId - `String`
          - pathPart - `String`
          - path - `String`
          - resourceMethods - `map`
        - deletedItems - `Array<map>` - the deleted resources
          - id - `String`
          - parentId - `String`
          - pathPart - `String`
          - path - `String`
        - operations - `Array<map>`
          - op - `String` - like a `"apiGateway.createResource"`
          - params - `map` - like a `{restApiId: 'xxx', path: '/foo'}`
          - message - `String` - like a `"apiGateway: create resource /foo"`
