/**
 *
 * @author yutent<yutent@doui.cc>
 * @date 2018/11/29 09:55:26
 */

'use strict'

const vsc = require('vscode')
const fs = require('iofs')
const path = require('path')
const uglify = require('uglify-es')

const std = vsc.window.createOutputChannel('js-minify')
const log = console.log

std.out = function(msg) {
  std.appendLine(msg)
}

const options = {
  compileOnSave: true,
  exclude: ''
}

const Compiler = {
  compile(origin, target) {
    try {
      var code = fs.cat(origin).toString()

      code = uglify.minify(code).code

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
      if (tmp.startsWith('./src')) {
        tmp = tmp.replace('./src', '.')
      }
      target = path.join(options.workspace, options.outdir, tmp)
    }

    this.compile(origin, target)
  }
}

function __init__() {
  try {
    let conf = vsc.workspace.getConfiguration('JSminify')
    let folders = vsc.workspace.workspaceFolders
    let wsDir = ''
    let configFile = ''

    Object.assign(options, conf)
    conf = null

    if (folders && folders.length) {
      wsDir = folders[0].uri.path
    }

    if (wsDir) {
      configFile = path.join(wsDir, '.es2jsrc')
    } else {
      let editor = vsc.window.activeTextEditor
      if (editor) {
        wsDir = path.dirname(editor.document.fileName)
        configFile = path.join(wsDir, '.es2jsrc')
      }
    }

    options.workspace = wsDir

    // 有配置文件时, 优先使用配置文件的配置
    if (fs.exists(configFile)) {
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

  let cmd = vsc.commands.registerCommand('JSminify.compile', _ => {
    let editor = vsc.window.activeTextEditor

    if (editor) {
      Compiler.compile(editor.document)
    }
  })
  ctx.subscriptions.push(cmd)
}
exports.deactivate = function() {}
