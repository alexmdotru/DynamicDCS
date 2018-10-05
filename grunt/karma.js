'use strict';

const replace = require('lodash/replace');
const supportsColor = require('supports-color');

module.exports = function task(grunt, config) {
	return {
		options: {
			colors: !!supportsColor,
			coverageReporter: {
				subdir: function subdir(browserName) {
					return replace(browserName, / /g, '_');
				},
				reporters: [
					{ type: 'cobertura' },
					{ type: 'html' },
					{ type: 'text-summary' },
				],
			},
			browserConsoleLogOptions: {
				terminal: true,
				level: ""
			},
			browsers: ['PhantomJS'],
			frameworks: ['jasmine'],
			junitReporter: {
				outputDir: 'coverage',
				outputFile: 'junit-report.xml',
			},
			logLevel: grunt.option('debug') ? 'DEBUG' : 'INFO',
			preprocessors: {
				'<%= eslint.app.src %>': ['coverage'],
			},
			reporters: ['dots', 'junit', 'coverage'],
			reportSlowerThan: 100,
		},
		once: {
			singleRun: true,
			files: {
				src: [
					grunt.file.readYAML(grunt.template.process(config.testEnvYAML, { data: config })) || '{}',
					'<%= concat.vendor.src %>',
					'<%= eslint.app.src %>',
					'<%= eslint.spec.src %>',
				],
			},
		},
	};
};
