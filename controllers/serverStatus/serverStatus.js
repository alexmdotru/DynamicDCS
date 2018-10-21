const _ = require('lodash');
const constants = require('../constants');
const masterDBController = require('../db/masterDB');

_.assign(exports, {
	checkServers: function () {
		masterDBController.serverActions('read', {enabled: true})
			.then(function (servers) {
				_.forEach(servers, function (server) {
					var serverName = server.name;
					var serverDBObj = _.get(masterDBController, ['dbObj', 'dbConn', serverName]);
					if (!serverDBObj) {
						masterDBController.connectDB(server.ip, serverName);
					}
				})
			})
			.catch(function (err) {
				console.log('line27: ', err);
			})
		;
	}
});

setInterval (function (){
	exports.checkServers();
}, 5 * 1000);
