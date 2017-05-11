'use strict';

var server = require('portal-fixture-server/server');

module.exports = function registerNOOP(grunt) {
	grunt.registerMultiTask(
		'portalFixtureServer',
		'A task to run the portal fixture server',
		function portalFixtureServerTask() {
			var options = this.options();

			var httpServer = server.start(options);

			grunt.log.writeln([
				'Portal Fixture Server listening on port ',
				httpServer.address().port,
				'...'
			].join(''));
		}
	);
};
