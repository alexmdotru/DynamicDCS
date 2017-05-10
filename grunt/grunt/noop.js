'use strict';

var _ = require('lodash');

module.exports = function registerNOOP(grunt) {
	grunt.registerTask(
		'noop',
		'A no-operation task -> useful in testing situations',
		_.noop
	);
};
