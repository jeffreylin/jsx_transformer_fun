#!/usr/bin/env node
/**
 * @providesModule JSX-cli
 */

var fs = require('fs');

var dirWatchTransformer = require('./dirWatchTransformer');
var log = require('./log');

var args = process.argv.slice(2);
var input_dir = args[0]
var output_dir = args[1];
var cache_dir = args[2];

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

var transformers = [function(filename, input){
  return input + 'lolztest';
}];
dirWatchTransformer(transformers, input_dir, output_dir, cache_dir);

function getHomeDir(){
  return (
    (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE)
    .replace(/\/*$/g, '')
  );
}