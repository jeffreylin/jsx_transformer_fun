/**
 * @providesModule Cache
 */
var fs = require('fs');

function Cache(cachePath) {
  this.cachePath = cachePath + '/';
  var stat = fs.statSync(cachePath);
  if (!stat.isDirectory()) {
    throw new Error('Couldn\'t open cache directory!');
  }
}

Cache.prototype = {
  get: function(hash) {
    try {
      fs.readFileSync(cachePath + hash);
    } catch(e) {
      return false;
    }
  },
  set: function(contents, hash) {
    try {
      fs.writeFileSync(cachePath + hash, contents);
      return true;
    } catch(e) {
      return false;
    }
  }
}

module.exports = Cache;