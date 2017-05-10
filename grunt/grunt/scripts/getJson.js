'use strict';

var resolve = require('path').resolve;

module.exports = function getJson(grunt, path, defaultValue) {
	var resolved = resolve(path);
	var value;
	if (grunt.file.exists(resolved)) {
		value = grunt.file.readJSON(resolved, { encoding: 'utf8' });
	} else {
		value = defaultValue;
	}
	return value;
};
