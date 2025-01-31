let browserslist = require('browserslist')
let postcss = require('postcss')
let agents = require('caniuse-lite').agents
let chalk = require('chalk')

let Browsers = require('./browsers')
let Prefixes = require('./prefixes')
let data = require('../data/prefixes')
let info = require('./info')

const WARNING = '\n' +
'  Replace Autoprefixer `browsers` option to Browserslist config.\n' +
'  Use `browserslist` key in `package.json` or `.browserslistrc` file.\n' +
'\n' +
'  Using `browsers` option cause some error. Browserslist config \n' +
'  can be used for Babel, Autoprefixer, postcss-normalize and other tools.\n' +
'\n' +
'  If you really need to use option, rename it to `overrideBrowserslist`.\n' +
'\n' +
'  Learn more at:\n' +
'  https://github.com/browserslist/browserslist#readme\n' +
'  https://twitter.com/browserslist\n' +
'\n'

function isPlainObject (obj) {
  return Object.prototype.toString.apply(obj) === '[object Object]'
}

let cache = {}

function timeCapsule (result, prefixes) {
  if (prefixes.browsers.selected.length === 0) {
    return
  }
  if (prefixes.add.selectors.length > 0) {
    return
  }
  if (Object.keys(prefixes.add).length > 2) {
    return
  }

  /* istanbul ignore next */
  result.warn(
    'Greetings, time traveller. ' +
    'We are in the golden age of prefix-less CSS, ' +
    'where Autoprefixer is no longer needed for your stylesheet.'
  )
}

module.exports = postcss.plugin('autoprefixer', (...reqs) => {
  let options
  if (reqs.length === 1 && isPlainObject(reqs[0])) {
    options = reqs[0]
    reqs = undefined
  } else if (reqs.length === 0 || (reqs.length === 1 && !reqs[0])) {
    reqs = undefined
  } else if (reqs.length <= 2 && (Array.isArray(reqs[0]) || !reqs[0])) {
    options = reqs[1]
    reqs = reqs[0]
  } else if (typeof reqs[reqs.length - 1] === 'object') {
    options = reqs.pop()
  }

  if (!options) {
    options = {}
  }

  if (options.browser) {
    throw new Error(
      'Change `browser` option to `overrideBrowserslist` in Autoprefixer'
    )
  } else if (options.browserslist) {
    throw new Error(
      'Change `browserslist` option to `overrideBrowserslist` in Autoprefixer'
    )
  }

  if (options.overrideBrowserslist) {
    reqs = options.overrideBrowserslist
  } else if (options.browsers) {
    if (typeof console !== 'undefined' && console.warn) {
      if (chalk && chalk.red) {
        console.warn(
          chalk.red(
            WARNING.replace(/`[^`]+`/g, i => chalk.yellow(i.slice(1, -1)))
          )
        )
      } else {
        console.warn(WARNING)
      }
    }
    reqs = options.browsers
  }

  if (typeof options.grid === 'undefined') {
    options.grid = false
  }

  let brwlstOpts = {
    ignoreUnknownVersions: options.ignoreUnknownVersions,
    stats: options.stats
  }

  function loadPrefixes (opts) {
    let d = module.exports.data
    let browsers = new Browsers(d.browsers, reqs, opts, brwlstOpts)
    let key = browsers.selected.join(', ') + JSON.stringify(options)

    if (!cache[key]) {
      cache[key] = new Prefixes(d.prefixes, browsers, options)
    }

    return cache[key]
  }

  function plugin (css, result) {
    let prefixes = loadPrefixes({
      from: css.source && css.source.input.file,
      env: options.env
    })
    timeCapsule(result, prefixes)
    if (options.remove !== false) {
      prefixes.processor.remove(css, result)
    }
    if (options.add !== false) {
      prefixes.processor.add(css, result)
    }
  }

  plugin.options = options

  plugin.browsers = reqs

  plugin.info = function (opts) {
    opts = opts || {}
    opts.from = opts.from || process.cwd()

    return info(loadPrefixes(opts))
  }

  return plugin
})

/**
 * Autoprefixer data
 */
module.exports.data = { browsers: agents, prefixes: data }

/**
 * Autoprefixer default browsers
 */
module.exports.defaults = browserslist.defaults

/**
 * Inspect with default Autoprefixer
 */
module.exports.info = () => module.exports().info()
