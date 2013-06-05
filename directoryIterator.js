/**
 * @providesModule directoryIterator
 */

var EventEmitter = require('events').EventEmitter;
var fs = require('fs');

var log = require('./log');
var Set = require('./Set');

/*
Events:
'file' - emits filepath relative to root_dir
'done' - all files processed
*/
function directoryIterator(_root_dir) {
  // normalize root_dir
  var root_dir = _root_dir.replace(/\/*$/g, '') + '/';

  var ee = new EventEmitter();
  process.nextTick(function(){
    directoryIteratorHelper(root_dir, ee);
  });
  return ee;
}

// queue contains both dir and file paths
// DFS - bcz it's easier to write and I'm lazy =P
function directoryIteratorHelper(root_dir, ee) {
  var queue = [''];
  var inodes = new Set();
  while (queue.length > 0) {

    // stat file
    var cur_path = root_dir + queue.pop();
    log('directoryIterator looking at path ' + cur_path, 1);
    var stats = fs.statSync(cur_path);

    // make sure we haven't already processed this file descriptor
    // this prevents us from infinite symlink loops
    var cur_inode = stats.ino;
    if (inodes.exists(cur_inode)) {
      continue;
    } else {
      inodes.add(cur_inode);
    }

    // handle the unique fd we got
    if (stats.isFile()) {
      ee.emit('file', cur_path.slice(root_dir.length));
      continue;
    }
    if (stats.isDirectory()) {
      var files = fs.readdirSync(cur_path);
      files.forEach(function(filename) {
        queue.push(cur_path.slice(root_dir.length) +  filename);
      });
      continue;
    }
    // not a file or dir
    log(
      [
        'Don\'t know what to do with file descriptor with stat: ',
        stats,
        ' from path ',
        cur_path
      ],
      5
    );
    continue;
  }
  ee.emit('done');
}

module.exports = directoryIterator;