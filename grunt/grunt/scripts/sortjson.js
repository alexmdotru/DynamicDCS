'use strict';

var _ = require('lodash');

module.exports = function registerSortJSON(grunt) {
	function sortObject(obj) {
		var sorted = {};
		var index = -1;
		var keys;
		var length;

		if (_.isArray(obj)) {
			return _.map(obj, sortObject);
		} else if (Object.prototype.toString.call(obj) !== '[object Object]') {
			return obj;
		}

		keys = _.keys(obj).sort();
		length = keys.length;

		while (length > ++index) {
			sorted[keys[index]] = sortObject(obj[keys[index]]);
		}

		return sorted;
	}

	grunt.registerMultiTask(
		'sortjson',
		'Sort json files',
		function sortjson() {
			var options = this.options({
				newLineEOF: true,
				replacer: null,
				space: 2
			});

			_.forEach(this.files, function sortFile(file) {
				var path = file.src[0];
				var src;

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
					grunt.log.writeln('File ' + file.dest.cyan + ' sorted.');
				} else {
					// Warn on invalid source files.
					grunt.log.warn('Source file "' + path + '" not found.');
				}
			});
		}
	);
};
