'use strict';

module.exports = {
	app: {
		src: ['<%= src %>/**/!(*spec).js'],
	},
	demo: {
		src: ['<%= demoSrc %>/**/*.js'],
	},
	grunt: {
		src: ['gruntfile.js', 'grunt/**/*.js'],
	},
	spec: {
		options: {
			env: {
				jasmine: true,
			},
			rules: {
				'max-nested-callbacks': [2, 5],
				'max-len': 1,
			},
		},
		src: ['<%= src %>/**/*.spec.js'],
	},
};
