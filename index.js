var assign = require('object-assign');

module.exports = function(apiGateway, params, cb) {
  params = assign({}, params);

  // Array<String>|String -> Array<String>
  if (!Array.isArray(params.path)) {
    params.path = [params.path];
  }

  // - extract parents to elements
  // - sort by length
  // ['/hi/hello-world', '/hi/hi/hi'] -> ['/', 'hi', 'hi/hi', 'hi/hi/hi', 'hello-world']
  var paths = params.path
    .reduce(function(list, path) {
      var segments = path.split("/");
      segments.forEach(function(_, i) {
        var s = segments.slice(0, i + 1).join("/") || '/';
        if (list.indexOf(s) === -1) {
          list.push(s);
        }
      });
      return list;
    }, [])
    .sort(function(a, b) {
      return a.length - b.length;
    });
  delete params.path;

  var deleteOthers = params.deleteOthers && function(putResult, existingItems, cb) {
    del(apiGateway, params, sub(existingItems, putResult.items), function(err, data) {
      if (err) {
        cb(err, null);
      } else {
        cb(null, {
          items: putResult.items,
          deletedItems: data.items,
          operations: putResult.operations.concat(data.operations)
        });
      }
    });
  };
  delete params.deleteOthers;

  list(apiGateway, params, function(err, existingItems) {
    if (err) {
      cb(err, null);
    } else {
      put(apiGateway, params, existingItems, paths, function(err, data) {
        if (err) cb(err, null);
        else if (deleteOthers) deleteOthers(data, existingItems, cb);
        else cb(null, assign(data, {deletedItems: []}));
      });
    }
  });
};

function del(apiGateway, params, items, cb) {
  var next = function(err, data) {
    if (err) {
      cb(err, null);
    } else {
      del(apiGateway, params, items.slice(1), function(err, ndata) {
        if (err) cb(err, null);
        else cb(null, concatData(data, ndata));
      });
    }
  };

  if (items.length === 0) {
    cb(null, {items: [], operations: []});
  } else {
    _del(apiGateway, params.restApiId, items[0], next);
  }
}

function put(apiGateway, params, existingItems, paths, cb) {
  var next = function(err, data) {
    data.items.forEach(function(item) {
      if (!find(existingItems, item.path)) {
        existingItems.push(item);
      }
    });

    if (err) {
      cb(err, null);
    } else {
      put(apiGateway, params, existingItems, paths.slice(1), function(err, ndata) {
        if (err) cb(err, null);
        else cb(null, concatData(data, ndata));
      });
    }
  };

  if (paths.length === 0) {
    cb(null, {items: [], operations: []});
  } else {
    _put(apiGateway, params.restApiId, existingItems, paths[0], next);
  }
}

function list(apiGateway, params, cb) {
  var next = function(err, data) {
    if (err) {
      cb(err, null);
    } else if (data.position) {
      var nparams = assign({}, params, {position: data.position});
      list(apiGateway, nparams, function(err, ndata) {
        if (err) cb(err, null);
        else cb(null, data.items.concat(ndata.items.concat));
      });
    } else {
      cb(null, data.items)
    }
  };

  apiGateway.getResources(params, next);
}

function _put(apiGateway, restApiId, existingItems, path, cb) {
  var s = split(path);
  var parentPath = s[0];
  var pathPart = s[1];
  var res = find(existingItems, path);
  if (res) return cb(null, {items: [res], operations: []});

  var parentId = path === '/' ? undefined : find(existingItems, parentPath).id;
  var params = {
    restApiId: restApiId,
    parentId: parentId,
    pathPart: pathPart
  };

  var operation = {
    op: 'apiGateway.createResource',
    params: params,
    message: 'apiGateway: create resource ' + path
  };

  apiGateway.createResource(params, function(err, data) {
    if (err) cb(err, null);
    else cb(null, {items: [data], operations: [operation]});
  });
}

function _del(apiGateway, restApiId, item, cb) {
  var params = {
    restApiId: restApiId,
    resourceId: item.id,
  };

  var operation = {
    op: 'apiGateway.deleteResource',
    params: params,
    message: "apiGateway: delete resource " + item.path,
  };

  apiGateway.deleteResource(params, function(err, data) {
    if (err) cb(err, null);
    else cb(null, {operations: [operation], items: [item]});
  });
}

// splits path to parentPath and pathPart
function split(path) {
  var segments = path.split('/');
  return [segments.slice(0, -1).join("/") || '/', segments[segments.length - 1]];
}

// finds the resource by path
function find(resources, path) {
  return resources.find(function(res) {
    return res.path === path;
  });
}

// substracts resources b from resources a
function sub(a, b) {
  return a.filter(function(aa) {
    return !find(b, aa.path);
  });
}

function concatData(data1, data2) {
  return {
    items: data1.items.concat(data2.items),
    operations: data1.operations.concat(data2.operations)
  };
}
