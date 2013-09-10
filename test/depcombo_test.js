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
  url: function(test) {
    test.expect(1);

    var actual = grunt.file.read('tmp/combo.url.js').replace(/combo_url_\d+/gi, 'combo_url');
    var expected = grunt.file.read('test/expected/combo.url.js');
    test.equal(actual, expected, 'not equal');

    test.done();
  },
  file: function(test) {
    test.expect(1);

    var actual = grunt.file.read('tmp/combo.file.js');
    var expected = grunt.file.read('test/expected/combo.file.js');
    test.equal(actual, expected, 'not equal');

    test.done();
  },
  replace: function(test) {
    test.expect(1);

    var actual = grunt.file.read('tmp/index.html').replace(/combo_url_\d+/gi, 'combo_url');
    var expected = grunt.file.read('test/expected/index.html');
    test.equal(actual, expected, 'not equal');

    test.done();
  }
};
