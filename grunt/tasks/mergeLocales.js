'use strict';

const forEach = require('lodash/forEach');
const isObject = require('lodash/isObject');
const isUndefined = require('lodash/isUndefined');
const keys = require('lodash/keys');
const merge = require('lodash/merge');
const path = require('path');

module.exports = function registerMergeLocales(grunt) {
	function sortPathsByLanguage(paths) {
		const sortedPaths = {};

		forEach(paths, (pathValue) => {
			const fileName = path.basename(pathValue, '.json');

			if (isUndefined(fileName)) {
				grunt.log.warn(`Failed to match locale pattern for ${fileName}`);
			}

			if (!sortedPaths[fileName]) {
				sortedPaths[fileName] = [];
			}

			sortedPaths[fileName].push(pathValue);
		});

		return sortedPaths;
	}

	function mergeLocalFiles(sortedPaths, options) {
		const locales = {};

		forEach(sortedPaths, (paths, key) => {
			if (isUndefined(locales[key])) {
				locales[key] = {};
			}

			forEach(paths, (pathValue) => {
				const locale = grunt.file.readJSON(pathValue);

				if (options.enforceNamespacing) {
					forEach(locale, (value, valueKey) => {
						if (!isObject(value)) {
							grunt.fail.fatal(
								`All locales must be namespaced, please move "${
								valueKey}" at ${pathValue} under appropriate module namespace`
							);
						}
					});
				}

				merge(locales[key], locale);
			});
		});

		return locales;
	}

	function writeLocaleFiles(locales, dest, options) {
		forEach(locales, (locale, languageKey) => {
			let localeJson = JSON.stringify(locale, options.replacer, options.space);

			// Add line at end of file if requested
			if (options.newLineEOF === true) {
				localeJson += grunt.util.linefeed;
			}

			grunt.file.write(path.join(dest, `${languageKey}.json`), localeJson);
		});
	}


	grunt.registerMultiTask(
		'mergeLocales',
		'Merge locales',
		function mergeLcoales() {
			const options = this.options({
				newLineEOF: true,
				replacer: null,
				space: 2,
				enforceNamespacing: true,
			});
			let sortedPaths;
			let mergedLocaleFiles;

			forEach(this.files, (file) => {
				if (file.src.length) {
					sortedPaths = sortPathsByLanguage(file.src);
					mergedLocaleFiles = mergeLocalFiles(sortedPaths, options);
					writeLocaleFiles(mergedLocaleFiles, file.dest, options);

					grunt.log.writeln(
						`${file.src.length} locale sources merged into ${
						keys(mergedLocaleFiles).length} files`
					);
				} else {
					grunt.log.warn('No locales were found');
				}
			});
		}
	);
};
