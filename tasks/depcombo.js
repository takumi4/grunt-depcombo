/*
 * grunt-depcombo
 * https://github.com/terrykingcha/grunt-depcombo
 *
 * Copyright (c) 2013 tERry.K
 * Licensed under the MIT license.
 */
'use strict';

var path = require('path'),
    fs = require('fs'),
    util = require('util'),
    curl = require('curl'),
    deptree = require('serialize-deptree'),

    PUBLISH_DOMAIN = 'http://g.tbcdn.cn/',
    DAILY_DOMAIN = 'http://g.assets.daily.taobao.net/',
    COMBO_TEMPLATE = 'document.write(\'<scr\' + \'ipt id="combo_url_{$id}" type="text/javascript" src="{$url}"></scr\' + \'ipt>\')',
    KEY_REGEXP = /([^\/\@]+)(?:\/([^@]+))?\@([\d\.]+)/gi;

module.exports = function(grunt) {
  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('depcombo', 'Generate combo url(file)', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var done = this.async(),
        options = this.options({
          domain: '',
          baseUrl: 'mtb/',
          prefix: '??',
          separator: ',',
          output: 'url',
          useDaily: false,
          useDebug: false,
          pattern: '<script id="combo_url_{$id:[^"]+}" src="{$src:[^"]+}"></script>',
          except: []
        }),
        mainPkg = options.pkg || grunt.file.readJSON('package.json'),
        domain = options.domain || options.useDaily?DAILY_DOMAIN:PUBLISH_DOMAIN;

    this.files.forEach(function(f) {
      if (mainPkg) {
        var tree = {}, dest = f.dest;

        (function iterateFunction(pkg, name, version, callback) {
            var deps = pkg.combo || [],
                key = name + '@' + version,
                complete = 0, depsName = Object.keys(deps), deplist;

            if (tree.hasOwnProperty(key)) {return callback();}

            deplist = tree[key] = [];

            if (!depsName.length) {return callback();}

            for (var i = 0; i < options.except.length; i++) {
              if (name.indexOf(options.except[i]) > -1) {
                return callback();
              }
            }

            depsName.forEach(function(depName) {
              var depVersion = deps[depName], depKey, packageUrl;

              depName = depName.replace('.', '-');
              depKey = depName + '@' + depVersion;
              packageUrl = domain + options.baseUrl + depName.split('/')[0] + '/' + depVersion + '/package.json';

              deplist.push(depKey);

              curl.get(packageUrl, function(err, response, body) {
                var pkg;

                try {
                  if (body) {
                    pkg = JSON.parse(body);
                  }
                } catch(e) {
                  grunt.log.warn('"' + packageUrl + '" is unexcepted');
                }

                if (pkg) {
                  iterateFunction(pkg, depName, depVersion, function() {
                    if (++complete === depsName.length) {
                      callback();
                    }
                  });
                } else {
                  grunt.log.warn('"' + packageUrl + '" is unexcepted');
                  if (++complete === depsName.length) {
                    callback();
                  }
                }
              });
            });
        })(mainPkg, mainPkg.name.replace('.', '-'), mainPkg.version, function() {
          var serialized = deptree.serialize(tree).map(function(key) {
                KEY_REGEXP.lastIndex = 0;
          	    var matches = KEY_REGEXP.exec(key);

                if (!matches) return;

                var projName = matches[1],
                    projPath = projName + '/' + matches[3] + '/',
                    names = projName.split('-'),
                    filePath = matches[2] || names[1] || names[0];

                for (var i = 0; i < options.except.length; i++) {
                  var name = options.except[i];
                  if (projPath.indexOf(name) > -1) {
                    return;
                  }
                }

                return projPath + filePath + (options.useDebug?'.debug':'') + '.js';
              }).filter(function(f) {
                return f;
              }),
              comboUrl = domain + options.baseUrl + options.prefix + serialized.join(options.separator);

          if (options.output === 'url') {
            grunt.file.write(dest, COMBO_TEMPLATE.replace('{$url}', comboUrl).replace('{$id}', Date.now()));
            grunt.log.writeln('Dest File "' + dest + '" created.');
            done();
          } else if (options.output === 'file') {
            curl.get(comboUrl, function(err, response, body) {
              grunt.file.write(dest, body);
              grunt.log.writeln('Dest File "' + dest + '" created.');
              done();
            });
          } else if (options.output === 'replace') {
            var html = grunt.file.read(dest),
                reg = new RegExp(options.pattern.replace(/\{\$\w+\:([^}]+)\}/gi, '$1'), 'gi'),
                tag = options.pattern.replace(/\{\$id\:[^}]+\}/i, Date.now())
                          .replace(/\{\$src\:[^}]+\}/i, comboUrl);

            if (reg.test(html)) {
              html = html.replace(reg, tag);
            } else {
              html = html.replace('<body>',  tag + grunt.util.linefeed + '<body>');
            }

            grunt.file.write(dest, html);
            grunt.log.writeln('Dest File "' + dest + '" replaced.');
            done();
          }
        });
      } else {
        grunt.log.error('specific "pkg" field in options');
      }
    });
  });

};
