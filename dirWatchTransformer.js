/**
 * @providesModule dirWatchTransformer
 */

var crypto = require('crypto');
var fs = require('fs');

var directoryIterator = require('./directoryIterator');
var log = require('./log');
var Cache = require('./Cache');

function dirWatchTransformer(transformers, input_dir, output_dir, cache_dir) {
  new DirWatchTransformer(transformers, input_dir, output_dir, cache_dir);
}

/*
transformers - array of callbacks with signature
String function(Object options);
options object: {
  filename: [String] path to file,
  contents: [String] file contents
}
*/
function DirWatchTransformer(transformers, _input_dir, _output_dir, _cache_dir) {
  // normalize dirs
  var input_dir = _input_dir.replace(/\/*$/g, '') + '/';
  var output_dir = _output_dir.replace(/\/*$/g, '') + '/';
  var cache_dir = _cache_dir.replace(/\/*$/g, '') + '/';

  // set obj vars
  this.cache = new Cache(cache_dir);
  this.inputDir = input_dir;
  this.outputDir = output_dir;
  this.transformers = transformers;

  // pre-calculate transformer hash
  var hasher = crypto.createHash('md5');
  transformers.forEach(function(transformer){
    hasher.update(transformer.toString());
  });
  this.transformerHash = hasher.digest();

  var processFileBound = this.processFile.bind(this);

  // initial pass
  var ee = directoryIterator(input_dir);
  ee.on('file', (function(relative_filepath){
    processFileBound(relative_filepath);
  }).bind(this));

  // watch for file changes
  fs.watch(input_dir, function(mutation_type, relative_filepath){
    processFileBound(relative_filepath);
  });
}

DirWatchTransformer.prototype = {
  // transforms file and writes to the output_dir
  processFile: function(relative_filepath) {
    var cache = this.cache;
    var transformers = this.transformers;
    var input_dir = this.inputDir;
    var output_dir = this.outputDir

    try {
      var contents = fs.readFileSync(input_dir + relative_filepath, 'utf-8');
    } catch(e) {
      log(e, 5);
      return;
    }

    // hash(filename + contents + hash(transformers));
    var hasher = crypto.createHash('md5');
    hasher.update(contents);
    hasher.update(this.transformerHash);
    var hash = hasher.digest();

    // check hash
    var cache_entry = cache.get(hash);
    if (cache_entry) {
      return; // no update necessary
    }

    // transform file
    transformers.forEach(function(transformer){
      contents = transformer(relative_filepath, contents);
    });

    // save file
    log('Updating file ' + output_dir + relative_filepath, 2);
    fs.writeFileSync(output_dir + relative_filepath, contents);

    // update cache
    cache.set(hash, contents);
  }
};

/*
TODO:
 - pre-calculate transformer hashes
 - need to return relative paths for output writing
 - transformer needs a willTransform() method
*/

module.exports = dirWatchTransformer;