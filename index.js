var assign = require('object-assign');

module.exports = function(apiGateway, params, cb) {
  params = assign({}, params);

  // Array<String>|String -> Array<String>
  if (!Array.isArray(params.path)) {
    params.path = [params.path];
  }

  // ['/hi/hello-world', '/hi/hi/hi'] -> ['/', 'hi', 'hello-world', 'hi/hi', 'hi/hi/hi']
  params.path = params.path.reduce(function(list, path) {
    var segments = path.split("/");
    segments.forEach(function(_, i) {
      var s = segments.slice(0, i + 1).join("/") || '/';
      if (list.indexOf(s) === -1) {
        list.push(s);
      }
    });
    return list;
  }, []);

  params.path.sort(function(a, b) {
    return a.length - b.length;
  });

  var client = new APIGateway(apiGateway, params.restApiId);
  client.list(function(err, existingItems) {
    if (err) {
      cb(err, null);
    } else {
      client.put(existingItems, params.path, params.deleteOthers, cb);
    }
  });
};

function APIGateway(sdk, restApiId) {
  this.sdk = sdk;
  this.restApiId = restApiId;
}

APIGateway.prototype.put = function(existingItems, paths, deleteOthers, cb, createdItems) {
  createdItems = createdItems || [];

  var callee = this.put.bind(this);

  var next = function(err, data) {
    if (err) {
      cb(err, null);
    } else {
      callee(existingItems, paths, deleteOthers, cb, createdItems.concat(data));
    }
  };

  if (paths.length === 0) {
    this.del(deleteOthers ? sub(existingItems, createdItems) : [], function(err, deletedItems) {
      if (err) {
        cb(err, null);
      } else {
        cb(null, {
          items: createdItems,
          deletedItems: deletedItems
        });
      }
    });
  } else {
    var path = paths.shift();

    var s = split(path);
    var parentPath = s[0]
    var pathPart = s[1]
    var all = existingItems.concat(createdItems);
    var res = find(all, path);
    if (res) {
      next(null, res);
    } else {
      var parent = find(all, parentPath);
      if (parent.path === path) { // root
        parent = null;
      }

      this.sdk.createResource({
        restApiId: this.restApiId,
        parentId: parent && parent.id,
        pathPart: pathPart
      }, next);
    }
  }
};

APIGateway.prototype.list = function(cb, position, listedItems) {
  listedItems = listedItems || [];

  var callee = this.list.bind(this);

  var params = {
    restApiId: this.restApiId,
    limit: 2,
    position: position
  };

  this.sdk.getResources(params, function(err, data) {
    if (err) {
      cb(err, null);
    } else {
      // drop unconcerned attributes
      data.items.forEach(function(item) {
        if (item.resourceMethods) {
          delete item.resourceMethods;
        }
      });

      listedItems = listedItems.concat(data.items)
      if (data.position) {
        callee(cb, data.position, listedItems);
      } else {
        cb(null, listedItems);
      }
    }
  });
};

APIGateway.prototype.del = function(items, cb, deletedItems) {
  deletedItems = deletedItems || []

  var callee = this.del.bind(this);

  if (items.length === 0) {
    cb(null, deletedItems);
  } else {
    var item = items.shift();
    var params = {
      restApiId: this.restApiId,
      resourceId: item.id,
    };
    this.sdk.deleteResource(params, function(err, data) {
      if (err) {
        cb(err, null);
      } else {
        callee(items, cb, deletedItems.concat(item));
      }
    });
  }
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
