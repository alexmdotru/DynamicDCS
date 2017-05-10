'use strict';
var _ = require('lodash');
var path = require('path');
var trunc = require('semver-truncate');

function getComponentVersion(name) {
	var packagePath = path.resolve('node_modules', name, 'package');
	var result = _.attempt(require, packagePath);

	if (_.isError(result)) { throw result; }

	return trunc(result.version, 'patch');
}

module.exports = _.memoize(getComponentVersion);
