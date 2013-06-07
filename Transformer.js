/**
 * @providesModule Transformer
 */

var _ = require('underscore');

/*
Expects options:
 - name: [String] Name of the transformer
 - shouldTransform: [Function : {code: [String], path: [String]}] Returns true/false if we should transform or not
 - transform: [Function : {code: [String], path: [String]}] Returns the transformed output code
*/
function Transformer(options) {
  // Copy properties from options to this.
  _(this).extend(options);

  if (!this.name) {
    throw new Error('Error in Transformer constructor - No name passed');
  }

  if (!this.shouldTransform) {
    throw new Error('Error in Transformer constructor - No shouldTransform passed');
  }

  if (!this.transform) {
    throw new Error('Error in Transformer constructor - No transform passed');
  }
}

module.exports = Transformer;
