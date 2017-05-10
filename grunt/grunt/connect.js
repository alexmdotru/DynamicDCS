'use strict';

var _ = require('lodash');
var resolve = require('path').resolve;
var pkg = require(resolve('package'));
var proxyMiddleware = require('http-proxy-middleware');
var rewriteMiddleware = require('http-rewrite-middleware').getMiddleware;
var bodyParser = require('body-parser');

var configureApiProxy = require('./scripts/configureApiProxy');
var dropResponseCookies = require('./scripts/middleware/dropResponseCookies');
var nodeModuleMiddleware = require('./scripts/middleware/nodeModules');
var serveMockApiMiddleware = require('./scripts/middleware/serveMockApi');

module.exports = function configureConnect(grunt) {
	function configureMiddleware(connect, options, defaultMiddleware) {
		var rewritePaths = _.get(options, 'rewritePaths', []);
		var proxies = _.get(options, 'proxies', []);
		var debug = grunt.option('debug');
		var middleware = [];

		middleware.push(
			rewriteMiddleware(rewritePaths, { verbose: debug }),
			nodeModuleMiddleware,
			dropResponseCookies
		);

		if (_.get(pkg, 'config.mockApi', false) || grunt.option('mock-api')) {
			middleware.push(bodyParser.json(), serveMockApiMiddleware);
		}

		_.forEach(proxies, function addProxies(proxy) {
			var proxyConfig = _.isFunction(proxy) ? proxy(grunt) : proxy;

			middleware.push(
				proxyMiddleware(
					proxyConfig.context,
					_.assign(proxyConfig.options, {
						logLevel: debug ? 'debug' : 'info'
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
				base: '<%= dest %>',
				hostname: '*',
				livereload: true,
				middleware: configureMiddleware,
				open: grunt.option('open') === true,
				port: 8000,
				proxies: [
					{   // Fixture server proxy
						context: ['/ui', '/svcs', '/core', '/totem'],
						options: {
							target: 'http://localhost:<%= portalFixtureServer.server.options.port %>'
						}
					},
					configureApiProxy
				],
				rewritePaths: [
					{ from: '^/$', to: '/apps/<%= package.name %>/', redirect: 'temporary' },
					{ from: '^/apps/<%= package.name %>/(.*?)$', to: '/$1' },
					{ from: '^/libs/<%= package.name %>/(?:[\\d\\.]+|latest)/(.*?)$', to: '/$1' },
					{ from: '^/libs/(.*?)/(?:[\\d\\.]+|latest)/(.*?)$', to: '/node_modules/$1/dist/$2' },
					{ from: '^/(.*?)/websvc', to: '/$1/api' }
				],
				useAvailablePort: true
			}
		},
		coverage: {
			options: {
				base: ['<%= grunt.file.expand("coverage/PhantomJS*")[0] || "coverage"%>'],
				hostname: '*',
				livereload: true,
				open: grunt.option('open') === true,
				port: 8001,
				useAvailablePort: true
			}
		}
	};
};
