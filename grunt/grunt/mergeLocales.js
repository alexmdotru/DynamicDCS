'use strict';

module.exports = function task(grunt, config) {
	return {
		vendorLocales: {
			src: grunt.file.readYAML(config.vendorLocales) || '{}',
			dest: '<%= dest %>/locales/'
		}
	};
};
