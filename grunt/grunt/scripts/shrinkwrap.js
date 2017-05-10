'use strict';
var _ = require('lodash');
var npmShrinkwrap = require('npm-shrinkwrap');

module.exports = function registerShrinkwrap(grunt) {
	function shrinkwrapTask() {
		var done = this.async();

		function callback(error, warnings) {
			if (error) { grunt.fail.warn(error); }

			_.forEach(warnings, function warn(warning) {
				grunt.log.verbose(warning.message);
			});

			grunt.log.writeln('File npm-shrinkwrap.json updated.');

			done();
		}

		npmShrinkwrap({ dev: true, dirname: process.cwd() }, callback);
	}

	grunt.task.registerTask('shrinkwrap', '', shrinkwrapTask);
};
