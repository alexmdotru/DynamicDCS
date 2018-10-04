'use strict';

const autoprefixer = require('autoprefixer');
const postcssSorting = require('postcss-sorting');

module.exports = {
	options: {
		processors: [
			autoprefixer({
				browsers: [
					'Android 2.3',
					'Android >= 4',
					'Chrome >= 20',
					'Firefox >= 24',
					'Explorer >= 9',
					'iOS >= 6',
					'Opera >= 12',
					'Safari >= 6',
				],
			}),
			postcssSorting({ order: 'csscomb' }),
		],
	},
	app: {
		src: '<%= less.app.dest %>',
	},
};
