/*
 * grunt-deptree
 * https://github.com/terrykingcha/grunt-deptree
 *
 * Copyright (c) 2013 tERry.K
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        '<%= nodeunit.tests %>',
      ],
      options: {
        jshintrc: '.jshintrc',
      },
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: ['tmp'],
    },

    // Configuration to be run (and then tested).
    depcombo: {
      url: {
        options: {
          useDaily: true,
          separator: ',',
          output: 'url',
          dependencies: grunt.file.readJSON('test/fixtures/package.json').dependencies
        },
        dest: 'tmp/combo.url.js'
      },

      file: {
        options: {
          useDaily: true,
          useDebug: true,
          separator: ',',
          except: ['zepto'],
          output: 'file',
          dependencies: grunt.file.readJSON('test/fixtures/package.json').dependencies
        },
        dest: 'tmp/combo.file.js'
      }
    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*_test.js'],
    },

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['clean', 'depcombo',  'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'test']);

};
