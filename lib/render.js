var fs = require('fs'),
    path = require('path'),
    pi = require('pipe-iterators'),
    glob = require('wildglob'),
    pipeline = require('./pipeline'),
    stream = require('./stream');

module.exports = function(argv, onDone)
{
  // --export
  if (argv['export']) {
    pi.fromArray(
      glob.sync(path.normalize(argv['export']).replace(/\/$/, '') + '/**')
    ).pipe(pi.filter(function(filename) {
          var stat = fs.statSync(filename);
          return stat.isFile();
        }))
        .pipe(stream.copy(function(filename) {
          var target = path.normalize(filename.replace(argv['export'], argv.output + '/'));
          console.log('Copy layout file', filename, '=>', target);
          return target;
        }))
        .pipe(pi.devnull().once('finish', finalDone));
    return;
  }

  processAssets(argv, function(append) {
      processMarkdown(argv, append, function() {
        if(onDone) onDone();
      });
  });
};

function processAssets(argv, onDone)
{
    // copy/combine assets
    var css = "";
    var assetDir = path.normalize(argv.layout + '/assets').replace(/\/$/, '');
    if (fs.existsSync(assetDir)) {
      // Combine and append css contents direcly into the MD file
      if(argv.flat)
      {
        pi.fromArray(glob.sync(assetDir + '/**'))
            .pipe(pi.filter(function(filename) {
              var stat = fs.statSync(filename);
              return stat.isFile();
            }))
          .pipe(stream.read())
          .pipe(pi.forEach(function(obj) {
            css+=obj.contents;
          }))
          .pipe(pi.devnull().once('finish', function() {
            onDone(css);
          }));
        } else {
          pi.fromArray(glob.sync(assetDir + '/**'))
              .pipe(pi.filter(function(filename) {
                var stat = fs.statSync(filename);
                return stat.isFile();
              }))
              .pipe(stream.copy(function(filename) {
                var target = path.normalize(filename.replace(assetDir, argv.output + '/assets/'));
                console.log('Copy asset file', filename, '=>', target);
                return target;
              }))
              .pipe(pi.devnull().once('finish', onDone));
        }
    } else {
      console.log('Assets path does not exist: ' + assetDir + ', so no assets were copied.');
      // always call onDone to increment the number of completed tasks
      onDone();
    }
}

function processMarkdown(argv, css, onDone)
{
  var files = argv.isSingleFile ? [argv.input] : glob.sync( argv.input.replace(new RegExp(path.sep + '$'), '') + '/**');

  pi.fromArray(files).pipe(pi.head([

    pi.filter(function(filename) {
      var stat = fs.statSync(filename);
      return stat.isFile();
    }),

    pi.match(
      // for non-markdown files: copy the file.
      function(filename) {
        var ext = path.extname(filename);
        if (ext === '.markdown' ||
            ext === '.mdown' ||
            ext === '.mkd' ||
            ext === '.mkdn' ||
            ext === '.md') {
          return false;
        }
        return true;
      },
      stream.copy(function(filename) {
        if (path.basename(filename) === 'meta.json') {
          return false;
        }
        var target = path.normalize(filename.replace(argv.input, argv.output));
        console.log('Copy non-markdown file', filename, '=>', target);
        return target;
      }),
      // rest:
      pi.head([
        stream.read(),
        pipeline(argv, css),
        stream.write().once('finish', onDone)
      ])
    )
  ]));
}
