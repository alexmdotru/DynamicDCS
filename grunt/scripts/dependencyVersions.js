'use strict';

const attempt = require('lodash/attempt');
const isError = require('lodash/isError');
const memoize = require('lodash/memoize');
const path = require('path');
const trunc = require('semver-truncate');

function getComponentVersion(name) {
	const packagePath = path.resolve('node_modules', name, 'package');
	const result = attempt(require, packagePath);

	if (isError(result)) { throw result; }

	return trunc(result.version, 'patch');
}

module.exports = memoize(getComponentVersion);
