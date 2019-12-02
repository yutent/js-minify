/**
 *
 * @author yutent<yutent@doui.cc>
 * @date 2018/11/29 09:55:26
 */

'use strict'

const vsc = require('vscode')
const std = vsc.window.createOutputChannel('es7-to-es5')
std.out = function(msg) {
  std.appendLine(msg)
}
// const log = console.log

const fs = require('iofs')
const path = require('path')
const babel = require('babel-core')
const uglify = require('uglify-es')

const BUILD_OPT = {
  presets: [
    [
      'env',
      {
        targets: {
          chrome: 48 // xp支持的最后一个版本,约在2016年初发布的
        }
      }
    ]
  ],
  plugins: [
    // 'transform-es2015-modules-amd',
    'transform-decorators-legacy',
    'transform-object-rest-spread',
    ['transform-es2015-classes', { loose: true }],
    ['transform-es2015-for-of', { loose: true }]
  ]
}

const options = {
  compileOnSave: true,
  minify: false,
  exclude: ''
}

const Compiler = {
  compile(origin, target) {
    try {
      let { code } = babel.transformFileSync(origin, BUILD_OPT)

      if (options.minify) {
        code = uglify.minify(code).code
      }

      fs.echo(code, target)
    } catch (err) {
      std.out(err)
    }
  },
  filter(doc) {
    // 未开启保存时编译
    if (!options.compileOnSave) {
      return
    }

    let origin = doc.fileName || ''

    // 只编译 es6, es7后缀的
    if (!/\.es[67]$/.test(origin)) {
      return
    }

    // 过滤不编译的文件
    if (options.exclude) {
      if (options.exclude.test(origin)) {
        return
      }
    }

    let target = origin.slice(0, -3) + 'js'

    if (options.outdir) {
      let tmp = target.replace(options.workspace, '.')
      target = path.join(options.outdir, tmp)
    }

    this.compile(origin, target)
  }
}

function __init__() {
  try {
    let conf = vsc.workspace.getConfiguration('ES7toES5')
    let folders = vsc.workspace.workspaceFolders
    let wsDir = ''
    let configFile = ''

    Object.assign(options, conf)
    conf = null

    if (folders && folders.length) {
      wsDir = folders[0].uri.path
    }

    if (wsDir) {
      configFile = path.join(wsDir, 'es7toes5.json')
    } else {
      let editor = vsc.window.activeTextEditor
      if (editor) {
        wsDir = path.dirname(editor.document.fileName)
        configFile = path.join(wsDir, 'es7toes5.json')
      }
    }

    // 以配置文件所在目录为根目录(workspace)
    if (fs.exists(configFile)) {
      options.workspace = path.dirname(configFile)

      let tmp = JSON.parse(fs.cat(configFile).toString())

      Object.assign(options, tmp)
      tmp = null

      if (options.outdir) {
        options.outdir = path.join(options.workspace, options.outdir)
      }
    }
    if (options.exclude) {
      options.exclude = new RegExp(options.exclude, 'i')
    }
  } catch (err) {
    std.out(err)
  }
}

exports.activate = function(ctx) {
  __init__()

  vsc.workspace.onDidChangeConfiguration(__init__)

  vsc.workspace.onDidSaveTextDocument(doc => {
    std.clear()
    Compiler.filter(doc)
  })
}
exports.deactivate = function() {}
