var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');
var util = require('util');

var _ = require('underscore');

// watchDir() - An Eventually Correct FS Watcher
function watchDir(path) {
  return new DirWatcher(path);
}

// Invariant: this only watches the dir inode, not the actual path.
// That means the dir can't be renamed and swapped w/ another dir
function DirWatcher(input_path) {
  EventEmitter.call(this);

  if (DEBUG) {
    debug_code(this);
  }

  var abs_path = path.resolve(input_path);
  if (!fs.statSync(abs_path).isDirectory()) {
    throw new Error("" + input_path + 'isn\'t a directory!');
  }

  this.ready = false;
  this.on('ready', function(){
    this.ready = true;
  }.bind(this));

  // map of abs_dir_paths to fs.FSWatcher objects from fs.watch()
  this.watchers = {};
  this.dirContents = {};

  this.rootPath = abs_path;

  // give other processes a tick to add event handlers
  process.nextTick(function(){
    this.add(abs_path);
    this.emit('ready');
  }.bind(this));
}

// Inherit methods from EventEmitter
util.inherits(DirWatcher, EventEmitter);

_(DirWatcher.prototype).extend({
  // invariant: abs_path is a directory
  add: function(abs_dir_path) {
    // Return if we're already watching this path
    if (this.watchers[abs_dir_path]) {return;}

    // Add new watcher
    this.watchers[abs_dir_path] = fs.watch(abs_dir_path);
    this.watchers[abs_dir_path].on('change', this.handleFsWatchEvent.bind(this, abs_dir_path));

    // Update internal dir contents
    this.updateDirContents(abs_dir_path);

    // Since we've never seen this path before, recursively add child directories of this path
    // TODO: Don't do fs.readdirSync on the same dir twice in a row.
    // We already do an fs.statSync in this.updateDirContents() and
    // we're just going to do another one here...
    var files = fs.readdirSync(abs_dir_path);
    files.forEach(function(filename) {
      var filepath = path.join(abs_dir_path, filename);

      // Look for directories
      var stat = fs.statSync(filepath);
      if (stat.isDirectory()) {
        this.add(filepath);
      }
    }.bind(this));
  },
  handleFsWatchEvent: function(abs_dir_path, evt, filename) {
    //console.log(['Raw fs.watch() event', arguments]);
    this.updateDirContents.apply(this, arguments);
  },
  updateDirContents: function(abs_dir_path, evt, fsWatchReportedFilename) {
    if (!this.dirContents[abs_dir_path]) {
      this.dirContents[abs_dir_path] = [];
    }

    var old_contents = this.dirContents[abs_dir_path];
    var new_contents = fs.readdirSync(abs_dir_path);

    // compare old_contents vs new_contents
    var deleted = _(old_contents).difference(new_contents);  // in old, not new
    var added = _(new_contents).difference(old_contents);    // in new, not old

    deleted.forEach(function(filename){
      this.emit(
        'deleted',
        path.relative(this.rootPath, path.join(abs_dir_path, filename))
      );
    }.bind(this));

    added.forEach(function(filename){
      this.emit(
        'added',
        path.relative(this.rootPath, path.join(abs_dir_path, filename))
      );
    }.bind(this));

    // so changed is not deleted or added?
    if (fsWatchReportedFilename && !_(deleted).contains(fsWatchReportedFilename) && !_(added).contains(fsWatchReportedFilename)) {
      this.emit(
        'changed',
        path.relative(this.rootPath, path.join(abs_dir_path, fsWatchReportedFilename))
      );
    }

    // if any of the things removed were directories, remove their watchers
    // if a dir was moved, hopefully two changed events fired?
    //  1) event in dir where it was removed
    //  2) event in dir where it was moved to (added)
    deleted.forEach(function(filename) {
      var filepath = path.join(abs_dir_path, filename);
      if (this.dirContents[filepath]) {
        this.dirContents[filepath] = undefined;
      }
      if (this.watchers[filepath]) {
        this.watchers[filepath] = undefined;
      }
    }.bind(this));

    // if any of the things added were directories, recursively deal with them
    added.forEach(function(filename) {
      var filepath = path.join(abs_dir_path, filename);
      var stat = fs.statSync(filepath);
      if (stat.isDirectory()) {
        this.add(filepath);
        // mighttttttt need a this.updateDirContents() here
        // in case we're somehow adding a path that replaces another one...?
      }
    }.bind(this));

    // Update state of internal dir contents
    this.dirContents[abs_dir_path] = new_contents;
  }
});

/*
Things to look out for:
If someone renames a directory, we'll have to change the name of the dir in "watchers" as well...
Symlink circles - need a test for this
*/

module.exports = watchDir;


//##################
// DEBUGGING
//##################
var DEBUG = false;
function debug_code(dirWatcher) {
  var old_emit = dirWatcher.emit;
  dirWatcher.emit = function() {
    console.log(_(arguments).toArray());
    old_emit.apply(dirWatcher, arguments);
  }
}
