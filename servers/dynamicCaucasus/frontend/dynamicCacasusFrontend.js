const _ = require('lodash');
const DCSSocket = require('../../../controllers/DCSSocket');
const dbMapServiceController = require('../../../controllers/dbMapService');

const unitsStaticsController = require('../../../controllers/serverToDbSync/unitsStatics');
const airbaseSyncController = require('../../../controllers/serverToDbSync/airbaseSync');

var CCB = {};

//config
_.assign(CCB, {
	serverName: 'TrueDynamicCaucasus',
	serverIP: '127.0.0.1',
	serverPort: '3001',
	queName: 'clientArray',
	db: {
		systemHost: 'localhost',
		systemDatabase: 'DynamicDCS',
		dynamicHost: 'localhost',
		dynamicDatabase: 'DDCSMaps'
	}
});

//checks to see if socket needs restarting every 3 secs
setInterval(function () {
	if (CCB.DCSSocket) {
		if (CCB.DCSSocket.connOpen) {
			console.log('Connecting to ' + CCB.serverName + ' Frontend');
			_.set(CCB, 'sessionName', '');
			CCB.DCSSocket.connSocket();
		}
	} else {
		CCB.DCSSocket = new DCSSocket.createSocket(CCB.serverName, CCB.serverIP, CCB.serverPort, CCB.queName, CCB.socketCallback);
	}
}, 3 * 1000);

_.set(CCB, 'getLatestSession', function (serverName, serverEpoc, startAbs, curAbs) {
	if (serverEpoc) {
		var sessionName = serverName + '_' + serverEpoc;
		var newSession = {
			_id: sessionName,
			name: sessionName
		};
		if (curAbs) {
			_.set(newSession, 'startAbsTime', startAbs);
			_.set(newSession, 'curAbsTime', curAbs);
		}
		if (sessionName !== _.get(CCB, ['sessionName'], '') || _.get(CCB, ['curAbsTime'], 0) > curAbs) {
			_.set(CCB, ['sessionName'], sessionName);
			_.set(CCB, ['curAbsTime'], curAbs);
			console.log('set new session');
			dbMapServiceController.statSessionActions('save', serverName, newSession)
				.catch(function (err) {
					console.log('line49', err);
				})
			;
		} else {
			console.log('use existing session');
			dbMapServiceController.statSessionActions('update', serverName, newSession)
				.catch(function (err) {
					console.log('line55', err);
				})
			;
		}
	}
});

_.set(CCB, 'socketCallback', function (serverName, cbArray) {
	if(!_.get(CCB, 'sessionName')) {
		CCB.getLatestSession(serverName, cbArray.epoc, cbArray.startAbsTime,  cbArray.curAbsTime);
	} else {
		_.forEach(_.get(cbArray, 'que', []), function (queObj) {

			if ((_.get(queObj, 'action') === 'C') || (_.get(queObj, 'action') === 'U') || (_.get(queObj, 'action') === 'D'))  {
				unitsStaticsController.processUnitUpdates(serverName, CCB.sessionName, queObj);
			}

			if (_.get(queObj, 'action') === 'airbaseC' || _.get(queObj, 'action') === 'airbaseU') {
				airbaseSyncController.processAirbaseUpdates(serverName, queObj);
			}


			console.log('queObj: ', queObj);
		});
	}
});
