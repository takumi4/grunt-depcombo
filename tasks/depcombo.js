/*
 * grunt-depcombo
 * https://github.com/terrykingcha/grunt-depcombo
 *
 * Copyright (c) 2013 tERry.K
 * Licensed under the MIT license.
 */
'use strict';

var path = require('path'),
    util = require('util'),
    curl = require('curl'),
    deptree = require('serialize-deptree'),

    PUBLISH_BASE_URL = 'http://g.tbcdn.com/mtb/',
    DAILY_BASE_URL = 'http://g.assets.daily.taobao.net/mtb/',
    COMBO_TEMPLATE = 'document.write(\'<scr\' + \'ipt type="text/javascript" src="{$url}"></scr\' + \'ipt>\')';

module.exports = function(grunt) {
  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('depcombo', 'Generate combo url(file)', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var done = this.async(),

        options = this.options({
          baseUrl: '',
          prefix: '??',
          separator: ',',
          output: 'url',
          useDaily: false,
          useDebug: false,
          appendTo: null.
          appendPatternBegin: '\\<\\!\\-\\-\\s+combo\\s+begin\\s+\\-\\-\\>',
          appendPatternEnd: '\\<\\!\\-\\-\\s+combo\\s+end\\s+\\-\\-\\>'
          except: []
        }),
        dependencies = options.dependencies || grunt.file.readJSON('package.json').dependenices,
        baseUrl = options.baseUrl || options.useDaily?DAILY_BASE_URL:PUBLISH_BASE_URL;

    this.files.forEach(function(f) {
      if (dependencies) {
        var tree = {}, map = {}, dest = f.dest;

        (function iterateFunction(deps, callback) {
            var complete = 0, depsName = Object.keys(deps);

            depsName.forEach(function(name) {
              var version = deps[name],
                  key = name + '@' + version,
                  names = name.split('/'),
                  projName, fileName;

              if (tree.hasOwnProperty(key)) return callback();

              tree[key] = [];
              projName = names[0] + '/' + version + '/';
              if (names.length > 1) {
                fileName = names.slice(1).join('/');
              } else {
                fileName = (names[0].indexOf('-') > -1?names[0].split('-')[1]:names[0]);
              }

              map[key] = {
                projName : projName,
                fileName : fileName
              };

              curl.get(baseUrl + projName + 'package.json', function(err, response, body) {
                var pkg;

                if (body) {
                  try {
                    pkg = JSON.parse(body);
                  } catch(e) {
                    throw new Error('"' + baseUrl + projName + 'package.json" is unexcepted');
                  }

                  if (pkg.dependencies) {
                    for (var name in pkg.dependencies) {
                      tree[key].push(name + '@' + pkg.dependencies[name]);
                    }

                    iterateFunction(pkg.dependencies, function() {
                      if (++complete === depsName.length) {
                        callback();
                      }
                    });
                  } else {
                    if (++complete === depsName.length) {
                      callback();
                    }
                  }
                } else {
                  if (++complete === depsName.length) {
                    callback();
                  }
                }
              });
            });
        })(dependencies, function() {
          var serialized = deptree.serialize(tree).map(function(key) {
                var projName = map[key].projName,
                    fileName = map[key].fileName;

                for (var i = 0; i < options.except.length; i++) {
                  var name = options.except[i];
                  if (projName.indexOf(name) > -1) {
                    return;
                  }
                }

                return projName + fileName + (options.useDebug?'.debug':'') + '.js';
              }).filter(function(f) {
                return f;
              }),
              comboUrl = baseUrl + options.prefix + serialized.join(options.separator);

          if (options.output === 'url') {
            grunt.file.write(dest, COMBO_TEMPLATE.replace('{$url}', comboUrl));
            grunt.log.writeln('Dest File "' + dest + '" created.');
            done();
          } else if (options.output === 'file') {
            curl.get(comboUrl, function(err, response, body) {
              grunt.file.write(dest, body);
              grunt.log.writeln('Dest File "' + dest + '" created.');
              done();
            });
          } else if (options.output === 'html') {
            var appendTo = options.appendTo || 'index.html',
                appendPatternBegin = options.appendPatternBegin,
                appendPatternEnd = options.appendPatternEnd;

            var html = grunt.file.read(appendTo);

            html.replace(new RegExp('(' + appendPatternBegin + ')([.\\r\\n\\s]*?)(' + appendPatternEnd + ')', 'gi'), function() {
              return '$1' + grunt.util.linefeed + COMBO_TEMPLATE.replace('{$url}', comboUrl) + grunt.util.linefeed + '$3';
            });
          }
        });
      } else {
        grunt.log.error('specific "dependencies" field in options');
      }
    });
  });

};
