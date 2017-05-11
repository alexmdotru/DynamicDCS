'use strict';

var supportsColor = require('supports-color');

module.exports = function task(grunt, config) {
	return {
		options: {
			colors: !!supportsColor,
			coverageReporter: {
				subdir: function subdir(browserName) {
					return browserName.replace(/ /g, '_');
				},
				reporters: [
					{ type: 'cobertura' },
					{ type: 'html' },
					{ type: 'text-summary' }
				]
			},
			browsers: ['PhantomJS'],
			frameworks: ['jasmine'],
			junitReporter: {
				outputDir: 'coverage',
				outputFile: 'junit-report.xml'
			},
			logLevel: grunt.option('debug') ? 'DEBUG' : 'INFO',
			preprocessors: {
				'<%= eslint.app.src %>': ['coverage']
			},
			reporters: ['dots', 'junit', 'coverage'],
			reportSlowerThan: 100
		},
		once: {
			singleRun: true,
			files: {
				src: [
					grunt.file.readYAML(config.testEnvYAML) || '{}',
					'<%= concat.vendor.src %>',
					'<%= eslint.app.src %>',
					'<%= eslint.spec.src %>'
				]
			}
		}
	};
};
