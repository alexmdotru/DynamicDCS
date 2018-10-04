'use strict';

const forEach = require('lodash/forEach');
const isArray = require('lodash/isArray');
const keys = require('lodash/keys');
const map = require('lodash/map');

module.exports = function registerSortJSON(grunt) {
	function sortObject(obj) {
		const sorted = {};
		let index = -1;

		if (isArray(obj)) {
			return map(obj, sortObject);
		} else if (Object.prototype.toString.call(obj) !== '[object Object]') {
			return obj;
		}

		const objKeys = keys(obj).sort();
		const length = objKeys.length;

		// eslint-disable-next-line no-plusplus
		while (length > ++index) {
			sorted[objKeys[index]] = sortObject(obj[objKeys[index]]);
		}

		return sorted;
	}

	grunt.registerMultiTask(
		'sortjson',
		'Sort json files',
		function sortjson() {
			const options = this.options({
				newLineEOF: true,
				replacer: null,
				space: 2,
			});

			forEach(this.files, (file) => {
				const path = file.src[0];
				let src;

				if (grunt.file.exists(path || ' ')) {
					// Read file source and convert to native JS Object
					src = grunt.file.readJSON(path);

					// Sort source Object.
					src = sortObject(src);

					// Stringify source Object for output
					src = JSON.stringify(src, options.replacer, options.space);

					// Add line at end of file if requested
					if (options.newLineEOF === true) {
						src += grunt.util.linefeed;
					}

					// Write the destination file.
					grunt.file.write(file.dest, src);

					// Print a success message.
					grunt.log.writeln(`File ${file.dest.cyan} sorted.`);
				} else {
					// Warn on invalid source files.
					grunt.log.warn(`Source file "${path}" not found.`);
				}
			});
		}
	);
};
