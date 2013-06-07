/*
 * @providesModule dirWatchTransformer
 */

var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
//var mkdirp = require('mkdirp');
var rmdirSyncRecursive = require('wrench').rmdirSyncRecursive;

var dirWatcher = require('./dirWatcher');
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
  var input_dir = path.resolve(_input_dir);
  var output_dir = path.resolve(_output_dir);
  var cache_dir = path.resolve(_cache_dir);

  // set obj vars
  this.cache = new Cache(cache_dir);
  this.inputDir = input_dir;
  this.outputDir = output_dir;
  this.transformers = transformers;

  var watcher = dirWatcher(input_dir);
  watcher.on('added', this.processAddedEvent.bind(this));
  watcher.on('deleted', this.processDeletedEvent.bind(this));
  watcher.on('changed', this.processChangedEvent.bind(this));

  // Debugging
  function logArguments(){
    log(Array.prototype.slice.call(arguments), 1);
  }
  watcher.on('added', logArguments.bind(null, 'added'));
  watcher.on('deleted', logArguments.bind(null, 'deleted'));
  watcher.on('changed', logArguments.bind(null, 'changed'));
}

DirWatchTransformer.prototype = {
  processAddedEvent: function(relative_filepath) {
    var input_path = path.join(this.inputDir, relative_filepath);
    try {
      var stat = fs.statSync(input_path);
    } catch(e) {
      // Race condition - file/dir has already been removed
      log(e,5);
      return;
    }

    if (stat.isFile()) {
      this.transformFileAndWriteToOutput(relative_filepath);
    } else if (stat.isDirectory()) {
      var output_path = path.join(this.outputDir, relative_filepath);
      if (!fs.existsSync(output_path)) {
        fs.mkdirSync(path.join(this.outputDir, relative_filepath));
      }
    } else {
      // Complain if it's not a file or directory
      log(['Don\'t know what to do with ', input_path, '. Got stat:', stat], 5);
    }
  },
  processDeletedEvent: function(relative_filepath) {
    var output_path = path.join(this.outputDir, relative_filepath);
    try {
      var stat = fs.statSync(output_path);
    } catch(e) {
      log(e,5);
      return;
    }

    if (stat.isFile()) {
      fs.unlinkSync(output_path);
    } else if (stat.isDirectory()) {
      rmdirSyncRecursive(output_path);
    } else {
      // Complain if it's not a file or directory
      log(['Don\'t know what to do with ', output_path, '. Got stat:', stat], 5);
    }
  },
  processChangedEvent: function(relative_filepath) {
    var input_path = path.join(this.inputDir, relative_filepath);
    try {
      var stat = fs.statSync(input_path);
    } catch(e) {
      // Race condition - file/dir has already been removed
      log(e,5);
      return;
    }

    if (stat.isFile()) {
      this.transformFileAndWriteToOutput(relative_filepath);
    } else if (stat.isDirectory()) {
      log('Actually not sure what to do with directory changed event... What does it mean???');
    } else {
      // Complain if it's not a file or directory
      log(['Don\'t know what to do with ', input_path, '. Got stat:', stat], 5);
    }
  },
  // invariant - input file exists
  // transforms file and writes to the output_dir
  transformFileAndWriteToOutput: function(relative_filepath) {
    var cache = this.cache;
    var transformers = this.transformers;
    var input_filepath = path.join(this.inputDir, relative_filepath);
    var output_filepath = path.join(this.outputDir, relative_filepath);

    try {
      var contents =
        fs.readFileSync(input_filepath, 'utf-8');
    } catch(e) {
      // Race condition - looks like the file doesn't actually exist
      log(e, 5);
      return;
    }

    // decide on transformers to execute
    transformers = this.transformers.filter(function(transformer) {
      return transformer.shouldTransform({
        code: contents,
        path: relative_filepath
      });
    });

    // hash(contents + transformer names);
    var hasher = crypto.createHash('md5');
    hasher.update(contents);
    transformers.forEach(function(transformer) {
      hasher.update(transformer.name);
    });
    var hash = hasher.digest();

    // check hash
    var cache_entry = cache.get(hash);
    if (cache_entry) {
      return; // no update necessary
    }

    // transform file
    log('Transforming file ' + input_filepath, 3);
    transformers.forEach(function(transformer){
      contents = transformer.transform({
        path: relative_filepath,
        code: contents
      });
    });

    // save file
    // hopefully the dir the file is in already exists...?  =[
    log('Writing file ' + output_filepath, 2);
    fs.writeFileSync(output_filepath, contents);

    // update cache
    cache.set(hash, contents);
  }
};

module.exports = dirWatchTransformer;

/*
TODO:
Make sure when writing a file to output that the output file isn't a dir and the output dir isn't a file
 - remember that the output dir can change from under us since we don't monitor it

Corner cases:
If we have
input_dir/mything
then behind the scenes change
output_dir/mything/
to be a directory, and then remove input_dir/mything, then output_dir/mything/ is removed as well...
IE: no dir vs file check there...
^this will probably never happen/matter... but just wanted to document that assumtion =P
*/
