'use strict';

var _ = require('lodash');
var resolve = require('path').resolve;
var pkg = require(resolve('package'));
var errorRequiredProperty = require('./errorRequiredProperty');
var getJson = require('./getJson');

function isTrue(object, path) {
	return _.get(object, path) === true;
}

module.exports = function configureApiProxy(grunt) {
	var proxyrc;
	var auth;
	var contract;
	var hosts;
	var hostName;
	var hostConfig;
	var accountId;
	var defaultHost;
	var authType;
	var authValues;

	proxyrc = getJson(grunt, '.proxy.json', {});
	authValues = grunt.config.get('pulsarAuthValues');

	auth = grunt.option('auth') || proxyrc.auth;
	contract = grunt.option('contract') || proxyrc.contract;
	accountId = grunt.option('accountId') || proxyrc.accountId;

	authType = _.get(pkg, 'config.authType');
	hosts = _.get(pkg, 'config.hosts', {});

	if (authType === 'pulsar') {
		defaultHost = {
			options: {
				changeOrigin: true,
				headers: {
					authorization: 'Bearer ' + authValues.token,
					cookie: 'AKASESSION=' + authValues.session
				},
				secure: false,
				target: 'https://iamakamai.sqaextranet.akamai.com'
			}
		};
	} else {
		defaultHost = {
			options: {
				auth: true,
				changeOrigin: true,
				headers: { 'X-ECWS-ManagedCustomer': true },
				secure: false,
				target: 'https://iamakamai.sqaextranet.akamai.com'
			}
		};
	}

	_.merge(hosts, { default: defaultHost });

	hostName = grunt.option('host') || 'default';
	hostConfig = hosts[hostName];

	_.defaults(hostConfig, {
		context: _.get(pkg, 'config.apiProxyContext', '/<%= package.name %>/api')
	});

	if (isTrue(hostConfig, 'options.auth') || grunt.option('auth')) {
		if (_.isUndefined(auth)) { errorRequiredProperty(grunt, 'auth', hostName); }
		_.set(hostConfig, 'options.auth', auth);
	}

	if (authType !== 'puslar') {
		if (isTrue(hostConfig, 'options.headers.X-AWS-CUSTOMER') || grunt.option('contract')) {
			if (_.isUndefined(contract)) { errorRequiredProperty(grunt, 'contract', hostName); }
			_.set(hostConfig, 'options.headers.X-AWS-CUSTOMER', contract);
		}

		if (isTrue(hostConfig, 'options.headers.X-ECWS-ManagedCustomer') || grunt.option('accountId')) {
			if (_.isUndefined(accountId)) { errorRequiredProperty(grunt, 'accountId', hostName); }
			_.set(hostConfig, 'options.headers.X-ECWS-ManagedCustomer', accountId);
		}
	}

	return hostConfig;
};
