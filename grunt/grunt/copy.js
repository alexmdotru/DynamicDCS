'use strict';
module.exports = function copyTask(grunt) {
	return {
		index: {
			options: {
				process: grunt.template.process
			},
			src: '<%= src %>/index.html',
			dest: '<%= dest %>/index.html'
		},
		locales: {
			cwd: '<%= src %>/assets/',
			expand: true,
			src: 'locales/*.json',
			dest: '<%= dest %>/'
		}
	};
};
