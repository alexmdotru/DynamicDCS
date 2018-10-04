'use strict';

const onHeaders = require('on-headers');

function removeCookies() {
	this.removeHeader('set-cookie');
}

module.exports = function dropResponseCookies(req, res, next) {
	onHeaders(res, removeCookies);
	next();
};
