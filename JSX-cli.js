#!/usr/bin/env node
/**
 * @providesModule JSX-cli
 */

var fs = require('fs');

var dirWatchTransformer = require('./dirWatchTransformer');
var log = require('./log');
var Transformer = require('./Transformer');

var args = process.argv.slice(2);
var input_dir = args[0]
var output_dir = args[1];
var cache_dir = args[2];

var transform = require('react-tools/vendor/fbtransform/lib/transform').transform;
var visitors = require('react-tools/vendor/fbtransform/visitors').transformVisitors;
var docblock = require('react-tools/vendor/fbtransform/lib/docblock');
var reactTransformer = new Transformer({
  name: 'React',
  transform: function(options) {
    return transform(visitors.react, options.code).code;
  },
  shouldTransform: function(options) {
    return (
      // Is a *.js file
      /\.js$/.test(options.path) &&
      // has an @jsx directive in the docblock
      docblock.parseAsObject(docblock.extract(options.code)).jsx
    );
  }
});

// make sure cache_dir exists
if (cache_dir) {
  if (!fs.existsSync(cache_dir) || !fs.statSync(cache_dir).isDirectory()) {
    log('cache_dir isn\'t actually a directory!', 5);
    process.exit(1);
  }
} else {
  cache_dir = getHomeDir() + '/.jsxCache';
  log('Auto-creating cache_dir: ' + cache_dir, 1);
  if (!fs.existsSync(cache_dir)) {
    fs.mkdirSync(cache_dir);
  }
}

var transformers = [reactTransformer];
dirWatchTransformer(transformers, input_dir, output_dir, cache_dir);

function getHomeDir(){
  return (
    (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE)
    .replace(/\/*$/g, '')
  );
}
