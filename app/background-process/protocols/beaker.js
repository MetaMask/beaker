import { protocol } from 'electron'
import path from 'path'
import url from 'url'
import once from 'once'
import fs from 'fs'
import http from 'http'
import crypto from 'crypto'
import listenRandomPort from 'listen-random-port'
import errorPage from '../../lib/error-page'
import {archivesDebugPage} from '../networks/dat/debugging'

// constants
// =

// content security policies
// the hash is an inline script in the editor
const BEAKER_CSP = `
  default-src 'self' beaker:;
  img-src beaker-favicon: data: dat: http: https;
  script-src 'self' beaker: 'sha256-/GH4WWPZSUCyeIShYuNnaB4V7PpybVDcxvRnWx1GRDE=';
  media-src 'self' beaker: dat:;
  style-src 'self' 'unsafe-inline' beaker:;
`.replace(/\n/g, '')

// globals
// =

var serverPort // port assigned to us
var requestNonce // used to limit access to the server from the outside

// exported api
// =

export function setup () {
  // generate a secret nonce
  requestNonce = '' + crypto.randomBytes(4).readUInt32LE(0)

  // setup the protocol handler
  protocol.registerHttpProtocol('beaker',
    (request, cb) => {
      // send requests to the protocol server
      cb({
        method: request.method,
        url: `http://localhost:${serverPort}/?url=${encodeURIComponent(request.url)}&nonce=${requestNonce}`
      })
    }, err => {
      if (err) {
        throw new Error('Failed to create protocol: beaker. ' + err)
      }
    }
  )

  // create the internal beaker HTTP server
  var server = http.createServer(beakerServer)
  listenRandomPort(server, { host: '127.0.0.1' }, (err, port) => serverPort = port)
}

// internal methods
// =

function beakerServer (req, res) {
  var cb = once((code, status, contentType, path) => {
    res.writeHead(code, status, {
      'Content-Type': (contentType || 'text/html'),
      'Content-Security-Policy': BEAKER_CSP,
      'Access-Control-Allow-Origin': '*'
    })
    if (typeof path === 'string') {
      fs.createReadStream(path).pipe(res)
    } else if (typeof path === 'function') {
      res.end(path())
    } else {
      res.end(errorPage(code + ' ' + status))
    }
  })
  var queryParams = url.parse(req.url, true).query
  var requestUrl = queryParams.url

  // check the nonce
  // (only want this process to access the server)
  if (queryParams.nonce !== requestNonce) {
    return cb(403, 'Forbidden')
  }

  // browser ui
  if (requestUrl === 'beaker:shell-window') {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'shell-window.html'))
  }
  if (requestUrl === 'beaker:shell-window.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'shell-window.build.js'))
  }
  if (requestUrl === 'beaker:shell-window.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/shell-window.css'))
  }
  if (requestUrl === 'beaker:icons.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/icons.css'))
  }
  if (requestUrl === 'beaker:font-awesome.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/fonts/font-awesome/css/font-awesome.min.css'))
  }
  if (requestUrl === 'beaker:fontawesome-webfont.woff2') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'assets/fonts/fontawesome-webfont.woff2'))
  }
  if (requestUrl === 'beaker:fontawesome-webfont.woff') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'assets/fonts/fontawesome-webfont.woff'))
  }
  if (requestUrl === 'beaker:fontawesome-webfont.svg') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'assets/fonts/fontawesome-webfont.svg'))
  }

  // builtin pages
  if (requestUrl === 'beaker:builtin-pages.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/builtin-pages.css'))
  }
  if (requestUrl === 'beaker:start') {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/start.html'))
  }
  if (requestUrl === 'beaker:start.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/builtin-pages/start.css'))
  }
  if (requestUrl === 'beaker:bookmarks') {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/bookmarks.html'))
  }
  if (requestUrl === 'beaker:library.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/builtin-pages/library.css'))
  }
  if (requestUrl.startsWith('beaker:library')) {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/library.html'))
  }
  if (requestUrl === 'beaker:history') {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/history.html'))
  }
  if (requestUrl === 'beaker:downloads') {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/downloads.html'))
  }
  if (requestUrl === 'beaker:settings') {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/settings.html'))
  }
  if (requestUrl === 'beaker:builtin-pages/bookmarks.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/bookmarks.build.js'))
  }
  if (requestUrl === 'beaker:builtin-pages/library.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/library.build.js'))
  }
  if (requestUrl === 'beaker:builtin-pages/history.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/history.build.js'))
  }
  if (requestUrl === 'beaker:builtin-pages/downloads.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/downloads.build.js'))
  }
  if (requestUrl === 'beaker:builtin-pages/settings.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/settings.build.js'))
  }
  if (requestUrl === 'beaker:builtin-pages/start.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/start.build.js'))
  }
  if (requestUrl.startsWith('beaker:editor/min/')) {
    let subpath = requestUrl.slice('beaker:editor/min/'.length).replace(/\.\./g, '')
    subpath = subpath.split('#')[0]
    var type = 'application/javascript'
    if (subpath.endsWith('css')) type = 'text/css'
    if (subpath.endsWith('svg')) type = 'image/svg+xml'
    return cb(200, 'OK', type, path.join(__dirname, 'node_modules/monaco-editor/min/', subpath))
  }
  if (requestUrl === 'beaker:editor' || requestUrl.startsWith('beaker:editor/')) {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/editor.html'))
  }
  if (requestUrl === 'beaker:editor.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/editor.build.js'))
  }
  if (requestUrl === 'beaker:editor-worker-proxy.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/editor-worker-proxy.js'))
  }
  if (requestUrl === 'beaker:editor.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/builtin-pages/editor.css'))
  }

  // modals
  if (requestUrl === 'beaker:create-archive-modal') {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/create-archive-modal.html'))
  }
  if (requestUrl === 'beaker:create-archive-modal.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/builtin-pages/create-archive-modal.css'))
  }
  if (requestUrl === 'beaker:create-archive-modal.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/create-archive-modal.build.js'))
  }
  if (requestUrl === 'beaker:fork-archive-modal') {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/fork-archive-modal.html'))
  }
  if (requestUrl === 'beaker:fork-archive-modal.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/builtin-pages/fork-archive-modal.css'))
  }
  if (requestUrl === 'beaker:fork-archive-modal.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/fork-archive-modal.build.js'))
  }

  // common assets
  if (requestUrl === 'beaker:font-photon-entypo') {
    return cb(200, 'OK', 'application/font-woff', path.join(__dirname, 'assets/fonts/photon-entypo.woff'))
  }
  if (requestUrl === 'beaker:font-source-sans-pro') {
    return cb(200, 'OK', 'application/font-woff2', path.join(__dirname, 'assets/fonts/source-sans-pro.woff2'))
  }
  if (requestUrl === 'beaker:font-source-sans-pro-le') {
    return cb(200, 'OK', 'application/font-woff2', path.join(__dirname, 'assets/fonts/source-sans-pro-le.woff2'))
  }
  if (requestUrl.startsWith('beaker:logo')) {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/logo.png'))
  }

  // debugging
  if (requestUrl === 'beaker:internal-archives') {
    return cb(200, 'OK', 'text/html', archivesDebugPage)
  }

  return cb(404, 'Not Found')
}
