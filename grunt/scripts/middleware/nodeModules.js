'use strict';

const replace = require('lodash/replace');
const serveStatic = require('serve-static');
const set = require('lodash/set');
const startsWith = require('lodash/startsWith');

const serveNodeModules = serveStatic('node_modules', { index: false });

module.exports = function nodeModuleMiddleware(req, res, next) {
	if (startsWith(req.url, '/node_modules/')) {
		set(req, 'originalUrl', req.url);
		set(req, 'url', replace(req.url, '/node_modules/', '/'));
		serveNodeModules(req, res, next);
	} else {
		next();
	}
};
