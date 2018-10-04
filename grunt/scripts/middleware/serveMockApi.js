'use strict';

const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const attempt = require('lodash/attempt');
const find = require('lodash/find');
const fs = require('fs');
const get = require('lodash/get');
const isError = require('lodash/isError');
const isFunction = require('lodash/isFunction');
const isString = require('lodash/isString');
const resolve = require('path').resolve;

// eslint-disable-next-line import/no-dynamic-require, global-require
const config = attempt(() => require(resolve('mock-api/mock-api.json')));

function mapRequest(req) {
	const matchedContext = find(config, (contextData, context) => {
		const contextMatchRegex = new RegExp(`${context}.*`);
		return contextMatchRegex.test(req.url);
	});

	const matchedRequest = find(matchedContext, (value, request) => {
		const reqMatchRegex = new RegExp(`.*${request}/?`);
		return reqMatchRegex.test(req.url);
	});

	return isString(matchedRequest) ? matchedRequest : get(matchedRequest, req.method);
}

function serveMockApi(req, res, next) {
	const mockApiFilePath = mapRequest(req);

	// if nothing matches continues with next middleware
	if (!mockApiFilePath) {
		return next();
	}

	// check if file exist
	if (!fs.existsSync(`mock-api/${mockApiFilePath}`)) {
		throw new Error(`${mockApiFilePath} does't exist`);
	}

	// load file
	// eslint-disable-next-line import/no-dynamic-require, global-require
	const file = require(resolve(`mock-api/${mockApiFilePath}`));

	// handle function
	if (isFunction(file)) {
		return jsonParser(req, res, () => {
			return file(req, res, next);
		});
	}

	// handle json
	res.setHeader('Content-Type', 'application/json');
	return res.end(JSON.stringify(file));
}

if (isError(config)) {
	module.exports = function noop(req, res, next) { return next(); };
} else {
	module.exports = serveMockApi;
}
