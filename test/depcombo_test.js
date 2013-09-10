'use strict';

var grunt = require('grunt');

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

exports.deptree = {
  setUp: function(done) {
    // setup here if necessary
    done();
  },
  concat_js: function(test) {
    test.expect(1);

    var actual = grunt.file.read('tmp/concat.js');
    var expected = grunt.file.read('test/expected/concat.js');
    test.equal(actual, expected, 'not equal');

    test.done();
  },
  concat_css: function(test) {
    test.expect(1);

    var actual = grunt.file.read('tmp/concat.css');
    var expected = grunt.file.read('test/expected/concat.css');
    test.equal(actual, expected, 'not equal');

    test.done();
  },
  concat_tree: function(test) {
    test.expect(1);

    var actual = grunt.file.read('tmp/concat.tree');
    var expected = grunt.file.read('test/expected/concat.tree');
    test.equal(actual, expected, 'not equal');

    test.done();
  }
};
