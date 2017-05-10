module.exports = function(grunt) {
	var options = {
		data: {
			appFileName: require('./package.json').name
		}
	};
	require('ns-grunt-bundle')(grunt, options);
};