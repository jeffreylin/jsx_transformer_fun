/**
 * @providesModule Set
 */
function Set() {
  this.elements = {};
}

Set.prototype = {
  add: function(key) {
    this.elements[key] = 1;
  },
  remove: function(key) {
    this.elements[key] = undefined;
  },
  exists: function(key) {
    return !!this.elements[key];
  }
};

module.exports = Set;