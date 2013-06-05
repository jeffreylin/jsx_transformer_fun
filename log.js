/**
 * @providesModule log
 */
var util = require('util');

var LOG_THRESHOLD = 1;

function log(msg, level) {
  if (level >= LOG_THRESHOLD) {
    console.log('[' + level + '] ' +util.inspect(msg));
  }
}

module.exports = log;