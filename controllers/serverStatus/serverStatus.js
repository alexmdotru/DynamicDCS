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
					masterDBController.statSessionActions('readLatest', serverName)
						.then(function (lastSession) {
							masterDBController.serverActions('update', {
								name: serverName,
								curTimer: lastSession.curAbsTime - lastSession.startAbsTime,
								isServerUp: new Date(lastSession.updatedAt).getTime() > new Date().getTime() - _.get(constants, 'time.fiveMins')
							})
								.catch(function (err) {
									console.log('line23: ', err);
								})
							;
						})
						.catch(function (err) {
							console.log('line20: ', err);
						})
					;
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
}, 60 * 1000);
