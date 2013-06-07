/**
 * @providesModule log
 */
var util = require('util');

var LOG_THRESHOLD = 1;
var TRACE_THRESHOLD = 5;

function log(msg, level) {
  if (level >= LOG_THRESHOLD) {
    console.log('[' + level + '] ' +util.inspect(msg));
    if (msg instanceof Error) {
      console.log(msg.stack);
    }
  }
  if (level >= TRACE_THRESHOLD) {
    console.trace();
  }
}

module.exports = log;
