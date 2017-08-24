var path = require('path'),
    pi = require('pipe-iterators');

module.exports = function(options) {
  return pi.map(function(item) {
    var relative = item.path.replace(options.input + '/', ''),
        outputDir;

    if (options.isSingleFile) {
      if(options.flat && options.output.indexOf(".html") > -1) {
        outputDir = path.normalize(item.path.replace(options.input, path.dirname(options.output) + path.sep));
      } else {
        outputDir = path.normalize(item.path.replace(options.input, options.output + path.sep));
      }
    } else {
      outputDir = path.normalize(path.dirname(item.path).replace(options.input, options.output + path.sep));
    }
    var extension = path.extname(item.path);
    // path: full path to the output file
    item.path = path.normalize(outputDir + path.sep + path.basename(item.path, extension) + '.html');
    // relative: path from top of the tree
    // used in merge-meta to implement cascading scope in meta.json
    item.relative = relative;

    // determine the relative path to ./output/assets
    // -- since files can be in subdirs like: sub/sub/dir/index.html

    item.assetsRelative = path.relative(outputDir, options['asset-path'] || options.output + '/assets');

    item.relative = item.relative.replace(/\\/g, '/');
    item.assetsRelative = item.assetsRelative.replace(/\\/g, '/');

    return item;
  });
};
