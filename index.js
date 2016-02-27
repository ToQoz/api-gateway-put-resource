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

  var deleteOthers = params.deleteOthers && function(putResult, existingItems, cb) {
    del(apiGateway, params, sub(existingItems, putResult.items), function(err, data) {
      if (err) {
        cb(err, null);
      } else {
        cb(null, {
          items: putResult.items,
          deletedItems: data.items
        });
      }
    });
  };

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
        else cb(null, {items: data.items.concat(ndata.items)});
      });
    }
  };

  if (items.length === 0) {
    cb(null, {items: []});
  } else {
    var item = items[0];

    apiGateway.deleteResource(
      {
        restApiId: params.restApiId,
        resourceId: item.id,
      },
      function(err, data) {
        if (err) next(err, null);
        else next(null, {items: [item]});
      }
    );
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
        else cb(null, {items: data.items.concat(ndata.items)});
      });
    }
  }.bind(this);

  if (paths.length === 0) {
    cb(null, {items: []});
  } else {
    var path = paths[0];

    var s = split(path);
    var parentPath = s[0]
    var pathPart = s[1]
    var res = find(existingItems, path);
    if (res) {
      next(null, {items: [res]});
    } else {
      var parent = find(existingItems, parentPath);
      if (parent.path === path) { // root
        parent = null;
      }

      apiGateway.createResource(
        {
          restApiId: this.restApiId,
          parentId: parent && parent.id,
          pathPart: pathPart
        },
        function(err, data) {
          if (err) next(err, null);
          else next(null, {items: [data]});
        }
      );
    }
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
