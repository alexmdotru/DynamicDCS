'use strict';
module.exports = function task(grunt, config) {
	return {
		app: {
			options: {
				banner: '<%= banner %>',
				sourceMap: true
			},
			src: ['<%= eslint.app.src %>', '<%= ngtemplates.app.dest %>'],
			dest: '<%= dest %>/<%= appFileName %>.js'
		},
		vendor: {
			src: grunt.file.readYAML(config.vendorYAML) || '{}',
			dest: '<%= dest %>/vendor.js'
		}
	};
};
