'use strict';

var _ = require('lodash');
var resolve = require('path').resolve;
var fs = require('fs');
var config = _.attempt(function loadMockApiConfig() {
	return require(resolve('mock-api/mock-api.json'));
});

function mapRequest(req) {
	var matchedContext = _.find(config, function matchContext(contextData, context) {
		var contextMatchRegex = new RegExp(context + '.*');
		return contextMatchRegex.test(req.url);
	});

	var matchedRequest = _.find(matchedContext, function matchRequest(value, request) {
		var reqMatchRegex = new RegExp('.*' + request + '/?');
		return reqMatchRegex.test(req.url);
	});

	return _.isString(matchedRequest) ? matchedRequest : _.get(matchedRequest, req.method, undefined);
}

function serveMockApi(req, res, next) {
	var mockApiFilePath = mapRequest(req);
	var file;

	// if nothing matches continues with next middleware
	if (!mockApiFilePath) {
		return next();
	}

	// check if file exist
	if (!fs.existsSync('mock-api/' + mockApiFilePath)) {
		throw new Error(mockApiFilePath + ' does\'t exist');
	}

	// load file
	file = require(resolve('mock-api/' + mockApiFilePath));

	// handle function
	if (_.isFunction(file)) {
		return file(req, res, next);
	}

	// handle json
	res.setHeader('Content-Type', 'application/json');
	return res.end(JSON.stringify(file));
}

if (_.isError(config)) {
	module.exports = function noop(req, res, next) { return next(); };
} else {
	module.exports = serveMockApi;
}
