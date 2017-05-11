'use strict';

var _ = require('lodash');
var got = require('got');
var cookie = require('cookie');
var getJson = require('./getJson');
var errorRequiredProperty = require('./errorRequiredProperty');
var resolve = require('path').resolve;
var pkg = require(resolve('package'));
var btoa = require('btoa');

module.exports = function registerAuthPuslarApi(grunt) {
	function getSession() {
		var proxyData;
		var authValues;

		proxyData = getJson(grunt, '.proxy.json', {});
		// we expect username and password to be present for authentication
		if (!proxyData.auth) {
			errorRequiredProperty(grunt, 'auth');
		}

		// auth value comes in as username:password
		authValues = proxyData.auth.split(':');

		return got.post(
			'https://iamakamai.sqaextranet.akamai.com/EdgeAuth/asyncUserLogin',
			{
				rejectUnauthorized: false,
				followRedirect: false,
				body: {
					username: authValues[0],
					password: authValues[1]
				}
			}
		).then(function sessionResponse(response) {
			var cookieValue = response.headers['set-cookie'];
			grunt.log.writeln('Session received');

			if (_.isUndefined(cookieValue)) {
				throw new Error(
					'Got empty response from server. This usually means that your USERNAME and/or' +
					'PASSWORD is incorrect. Please update .proxy.json and try again.'
				);
			}

			return response.headers['set-cookie'];
		}).catch(function sessionErrorResponse(error) {
			grunt.fail.fatal('Failed to acquire session: ' + error);
			throw error;
		});
	}

	function getToken(cookies) {
		var proxyData;
		var bytes;
		var account_suffix;
		var akaTokenCookies = cookies;
		var suffixTemplate = _.template('${accountName}_${contractType}~~${accountId}');
		var cookiesTemplate = _.template('${cookies};AKALASTMANAGEDACCOUNT=${accountSuffix}');

		proxyData = getJson(grunt, '.proxy.json', {});
		if(proxyData.accountName && proxyData.accountId && proxyData.contractType) {
			bytes = suffixTemplate(
				{
					'accountName': proxyData.accountName,
					'contractType': proxyData.contractType,
					'accountId': proxyData.accountId
				}
			);
			account_suffix = btoa(bytes);
			akaTokenCookies = cookiesTemplate(
				{
					'cookies': akaTokenCookies,
					'accountSuffix': account_suffix
				}
			);
		}

		return got.post(
			'https://iamakamai.sqaextranet.akamai.com/ids-authn/v1/oauth2/token',
			{
				rejectUnauthorized: false,
				headers: {
					'Akamai-Accept': 'akamai/cookie',
					cookie: akaTokenCookies
				},
				body: {
					client_id: pkg.config.clientId,
					grant_type: 'password_assertion'
				}
			}
		).then(function tokenResponse(response) {
			grunt.log.writeln('Token received');
			return cookie.parse(response.headers['set-cookie'][0]).AKATOKEN;
		}).catch(function tokenErrorResponse(error) {
			grunt.fail.fatal('Failed to acquire token: ' + error);
			throw error;
		});
	}

	grunt.registerMultiTask(
		'authPulsarApi',
		function authPulsarApi() {
			var done = this.async();

			// check if project configured for the pulsar type of authentication
			if (_.get(pkg, 'config.authType') !== 'pulsar') {
				grunt.log.writeln('authType is ' + _.get(pkg, 'config.authType') + ', Pulsar authentication is not required');
				return done();
			}

			// clientId is required for authentication
			if (_.isUndefined(pkg.config.clientId)) {
				grunt.fail.fatal('package.json/config missing clientId value');
			}

			return getSession()
				.then(function handleSessionCookies(cookies) {
					getToken(cookies)
						.then(function handleToken(token) {
							grunt.config.set('pulsarAuthValues', {
								session: cookie.parse(cookies[2]).AKASESSION,
								token: token
							});

							grunt.log.writeln('Authentication Successful');
							return done();
						})
					;
				})
			;
		}
	);
};
