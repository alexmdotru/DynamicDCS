'use strict';

var _ = require('lodash');
var serveStatic = require('serve-static');
var serveNodeModules = serveStatic('node_modules', { index: false });

module.exports = function nodeModuleMiddleware(req, res, next) {
	if (_.startsWith(req.url, '/node_modules/')) {
		_.set(req, 'originalUrl', req.url);
		_.set(req, 'url', req.url.replace('/node_modules/', '/'));
		serveNodeModules(req, res, next);
	} else {
		next();
	}
};
