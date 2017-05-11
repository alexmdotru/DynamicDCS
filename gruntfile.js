'use strict';

var _ = require('lodash');
var path = require('path');
var getDependencyVersions = require('./grunt/scripts/dependencyVersions.js');
var gruntTemplateProgeny = require('grunt-template-progeny');
var gruntTemplateRename = require('grunt-template-rename');
var loadGruntConfig = require('load-grunt-config');

module.exports = function (grunt) {
	var options = {
		data: {
			appFileName: require('./package.json').name
		}
	};

	var projectPath = process.cwd();

	var defaults = {
		overridePath: path.join(projectPath, 'grunt'),
		data: {
			BUILD_NUMBER: process.env.BUILD_NUMBER || 'Development',
			GIT_COMMIT: process.env.GIT_COMMIT || 'Development',
			appFileName: '<%= package.name %>',
			banner: grunt.file.read('./grunt/banner.txt'),
			dest: 'dist',
			process: grunt.template.process,
			src: 'app',
			temp: '.temp',
			testEnvYAML: 'app/test-env.yml',
			useMin: grunt.option('min') || _.includes(grunt.cli.tasks, 'build'),
			vendorYAML: 'app/vendor.js.yml',
			vendorLocales: 'app/locales.yml',
			versions: getDependencyVersions
		},
		jitGrunt: {
			pluginsRoot: './node_modules',
			staticMappings: {
				configureProxies: 'grunt-connect-proxy',
				force: 'grunt-force-task',
				mergeLocales: './grunt/scripts/mergeLocales.js',
				ngtemplates: 'grunt-angular-templates',
				portalFixtureServer: './grunt/scripts/portalFixtureServer.js',
				shrinkwrap: './grunt/scripts/shrinkwrap.js',
				sortjson: './grunt/scripts/sortjson.js'
			}
		}
	};

	// Apply grunt template helpers
	gruntTemplateProgeny(grunt);
	gruntTemplateRename(grunt);
	_.set(grunt, 'template.path', path);

	if (grunt.option('time') === true) { require('time-grunt')(grunt); }

	loadGruntConfig(grunt, _.merge({}, defaults, options));
};
