module.exports = APIGateway;

function APIGateway() {
  var root = {
    id: require('crypto').randomBytes(Math.ceil(10)).toString('hex').slice(0, 10),
    path: '/'
  };
  this.resources = [root];
}

APIGateway.prototype.getResources = function(params, cb) { cb(null, {items: this.resources}); }
APIGateway.prototype.deleteResource = function(params, cb) {
  this.resources = this.resources.filter(function(res) {
    return res.id !== params.resourceId;
  });
  cb(null, {});
};
APIGateway.prototype.createResource = function(params, cb) {
  var parentPath = '';
  var parentId = params.parentId;
  while(true) {
    var parent = this.resources.find(function(res) {
      return res.id === parentId;
    });
    if (parent) {
      if (parent.pathPart) {
        parentPath += parent.pathPart + '/';
      }
      parentId = parent.parentId;
    } else {
      break;
    }
  }

  var res = {
    id: require('crypto').randomBytes(Math.ceil(10)).toString('hex').slice(0, 10),
    parentId: params.parentId,
    pathPart: params.pathPart,
    path: '/' + parentPath + params.pathPart,
  };
  this.resources.push(res);
  cb(null, res);
};
