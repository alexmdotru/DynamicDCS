const _ = require('lodash');
const constants = require('../../controllers/constants');
const DCSSocket = require('../../controllers/net/DCSSocket');
const masterDBController = require('../../controllers/db/masterDB');
const airbaseSyncController = require('../../controllers/serverToDbSync/airbaseSync');

//config
var mapType = 'Caucasus';
//var mapType = 'PersianGulf';
var masterServer = '127.0.0.1';
var serverName = 'DDCS1978ColdWar';

masterDBController.initDB(serverName, masterServer);

constants.initServer(serverName)
	.then(function () {

//checks to see if socket needs restarting every 3 secs
		setInterval(function () {
			if (exports.DCSSocket) {
				if (exports.DCSSocket.connOpen) {
					console.log('Connecting to ' + serverName + ' Frontend');
					_.set(exports, 'sessionName', '');
					masterDBController.cmdQueActions('removeall', serverName, {})
						.then(function () {
							exports.DCSSocket.connSocket();
						})
						.catch(function (err) {
							console.log('line62', err);
						})
					;
				}
			} else {
				exports.DCSSocket = new DCSSocket.createSocket(serverName, 'localhost', _.get(constants, 'config.dcsClientPort'), 'clientArray', exports.socketCallback, 'frontend');
				setTimeout(function () {
					var sendClient = {action: "GETPOLYDEF"};
					var actionObj = {actionObj: sendClient, queName: 'clientArray'};
					masterDBController.cmdQueActions('save', serverName, actionObj)
				}, 20 * _.get(constants, 'time.sec'))
			}
		}, 3 * _.get(constants, 'time.sec'));

		_.set(exports, 'socketCallback', function (serverName, cbArray) {
			_.forEach(_.get(cbArray, 'que', []), function (queObj) {
				console.log('qo: ', queObj);
				if (_.get(queObj, 'action') === 'airbaseC') {
					airbaseSyncController.processAirbaseUpdates(serverName, mapType, queObj);
				}
			});
		});
	})
	.catch(function (err) {
		console.log('line267', err);
	})
;
