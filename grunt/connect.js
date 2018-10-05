'use strict';

const assign = require('lodash/assign');
const bodyParser = require('body-parser');
const forEach = require('lodash/forEach');
const get = require('lodash/get');
const isFunction = require('lodash/isFunction');
const proxyMiddleware = require('http-proxy-middleware');
const resolve = require('path').resolve;
const rewriteMiddleware = require('http-rewrite-middleware').getMiddleware;

// eslint-disable-next-line import/no-dynamic-require
const pkg = require(resolve('package'));

const dropResponseCookies = require('./scripts/middleware/dropResponseCookies');
const nodeModuleMiddleware = require('./scripts/middleware/nodeModules');
const serveMockApiMiddleware = require('./scripts/middleware/serveMockApi');

module.exports = function configureConnect(grunt) {
	function configureMiddleware(connect, options, defaultMiddleware) {
		const rewritePaths = get(options, 'rewritePaths', []);
		const proxies = get(options, 'proxies', []);
		const debug = grunt.option('debug');
		const middleware = [];

		middleware.push(
			rewriteMiddleware(rewritePaths, { verbose: debug }),
			nodeModuleMiddleware,
			dropResponseCookies
		);

		if (get(pkg, 'config.mockApi', false) || grunt.option('mock-api')) {
			middleware.push(serveMockApiMiddleware);
		}

		forEach(proxies, (proxy) => {
			const proxyConfig = isFunction(proxy) ? proxy(grunt) : proxy;

			middleware.push(
				proxyMiddleware(
					proxyConfig.context,
					assign(proxyConfig.options, {
						logLevel: debug ? 'debug' : 'info',
					})
				)
			);
		});

		return middleware.concat(defaultMiddleware);
	}

	// Connect task config
	return {
		server: {
			options: {
				base: ['<%= demoDest %>', '<%= dest %>'],
				hostname: '*',
				livereload: true,
				middleware: configureMiddleware,
				open: grunt.option('open') === true,
				port: 8000,
				rewritePaths: [
					{ from: '^/libs/<%= package.name %>/(?:[\\d\\.]+|latest)/(.*?)$', to: '/$1' },
					{ from: '^/libs/(.*?)/(?:[\\d\\.]+|latest)/(.*?)$', to: '/node_modules/$1/dist/$2' },
					{ from: '^/(.*?)/websvc', to: '/$1/api' },
				],
				useAvailablePort: true,
			},
		},
		coverage: {
			options: {
				base: ['<%= grunt.file.expand("coverage/PhantomJS*")[0] || "coverage"%>'],
				hostname: '*',
				livereload: true,
				open: grunt.option('open') === true,
				port: 8001,
				useAvailablePort: true,
			},
		},
	};
};
