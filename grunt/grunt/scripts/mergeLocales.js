'use strict';

var _ = require('lodash');
var path = require('path');

module.exports = function registerMergeLocales(grunt) {
	function sortPathsByLanguage(paths) {
		var sortedPaths = {};

		_.forEach(paths, function iterateOverPaths(pathValue) {
			var fileName = path.basename(pathValue, '.json');

			if (_.isUndefined(fileName)) {
				grunt.log.warn('Failed to match locale pattern for ' + fileName);
			}

			if (!sortedPaths[fileName]) {
				sortedPaths[fileName] = [];
			}

			sortedPaths[fileName].push(pathValue);
		});

		return sortedPaths;
	}

	function mergeLocalFiles(sortedPaths, options) {
		var locales = {};

		_.forEach(sortedPaths, function iterateOverSortedPaths(paths, key) {
			if (_.isUndefined(locales[key])) {
				locales[key] = {};
			}

			_.forEach(paths, function mergeLocaleFile(path) {
				var locale = grunt.file.readJSON(path);

				if (options.enforceNamespacing) {
					_.forEach(locale, function enforceNameSpacing(value, valueKey) {
						if (!_.isObject(value)) {
							grunt.fail.fatal(
								'All locales must be namespaced, please move "' +
								valueKey + '" at ' + path + ' under appropriate module namespace'
							);
						}
					});
				}

				_.merge(locales[key], locale);
			});
		});

		return locales;
	}

	function writeLocaleFiles(locales, dest, options) {
		_.forEach(locales, function writeLocaleFile(locale, languageKey) {
			var localeJson = JSON.stringify(locale, options.replacer, options.space);

			// Add line at end of file if requested
			if (options.newLineEOF === true) {
				localeJson += grunt.util.linefeed;
			}

			grunt.file.write(path.join(dest, languageKey + '.json'), localeJson);
		});
	}


	grunt.registerMultiTask(
		'mergeLocales',
		'Merge locales',
		function mergeLcoales() {
			var options = this.options({
				newLineEOF: true,
				replacer: null,
				space: 2,
				enforceNamespacing: true
			});
			var sortedPaths;
			var mergedLocaleFiles;

			_.forEach(this.files, function iterateOverTasks(file) {
				if (file.src.length) {
					sortedPaths = sortPathsByLanguage(file.src);
					mergedLocaleFiles = mergeLocalFiles(sortedPaths, options);
					writeLocaleFiles(mergedLocaleFiles, file.dest, options);

					grunt.log.writeln(
						file.src.length + ' locale sources merged into ' +
						_.keys(mergedLocaleFiles).length + ' files'
					);
				} else {
					grunt.log.warn('No locales were found');
				}
			});
		}
	);
};
