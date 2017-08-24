var fs = require('fs'),
    pi = require('pipe-iterators'),
    md = require('markdown-stream-utils'),
    setOutputPath = require('./set-output-path'),
    applyTemplate = require('./apply-template'),
    mergeMeta = require('./merge-meta'),
    convertMd = require('./convert-md');

module.exports = function(argv, css) {
  if (!argv.meta) {
    // load the metadata file if it exists
    argv.meta = fs.existsSync(argv.input + '/meta.json') ? require(argv.input + '/meta.json') : {};
  }

  return pi.pipeline([
      md.parseHeader(),
      md.parseMd(),
      md.annotateMdHeadings(),
      md.highlight(function(code, lang) {
        if (argv.highlight && typeof argv.highlight[lang] === 'function') {
          return argv.highlight[lang](code, lang);
        }
        return false;
      }),
      convertMd({
        'header-links': argv['header-links']
      }),

      // map paths
      setOutputPath({
        input: argv.input,
        output: argv.output ? argv.output : "./",
        isSingleFile: argv.isSingleFile,
        flat: argv.flat,
        'asset-path': argv['asset-path']
      }),

      // merge metadata now that relative is set
      mergeMeta(argv.meta),

      // apply handlebars templates
      applyTemplate({
        // read the template
        template: fs.readFileSync(argv.layout + '/page.html', 'utf8'),
        partials: fs.existsSync(argv.layout + '/partials') ? argv.layout + '/partials' : [],
        helpers: fs.existsSync(argv.layout + '/helpers') ? argv.layout + '/helpers' : []
      }),
      pi.forEach(function(file) {
        if(css && css!="" && file.contents)
        {
          // There is dirty way to inject css in the page
          file.contents = file.contents.replace("</body>", "<style>"+css+"</style></body>");
        }
      })
  ]);
};
