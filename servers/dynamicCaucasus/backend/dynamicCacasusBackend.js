const _ = require('lodash');
const DCSSocket = require('../../../controllers/DCSSocket');
const dbMapServiceController = require('../../../controllers/dbMapService');

const playersEvent = require('../../../controllers/events/backend/players');
const friendlyFireEvent = require('../../../controllers/events/backend/friendly_fire');
const selfKillEvent = require('../../../controllers/events/backend/self_kill');
const connectEvent = require('../../../controllers/events/backend/connect');
const disconnectEvent = require('../../../controllers/events/backend/disconnect');

var DCB = {};

//config
_.assign(DCB, {
	serverName: 'TrueDynamicCaucasus',
	serverIP: '127.0.0.1',
	serverPort: '3002',
	queName: 'GameGuiArray',
	db: {
		systemHost: 'localhost',
		systemDatabase: 'DynamicDCS',
		dynamicHost: 'localhost',
		dynamicDatabase: 'DDCSMaps'
	}
});

//checks to see if socket needs restarting every 3 secs
setInterval(function () {
	if (DCB.DCSSocket) {
		if (DCB.DCSSocket.connOpen) {
			console.log('Connecting to ' + DCB.serverName + ' Backend');
			DCB.DCSSocket.connSocket();
		}
	} else {
		DCB.DCSSocket = new DCSSocket.createSocket(DCB.serverName, DCB.serverIP, DCB.serverPort, DCB.queName, DCB.socketCallback);
	}
}, 3 * 1000);

_.set(DCB, 'getLatestSession', function (serverName) {
	dbMapServiceController.statSessionActions('readLatest', serverName, {})
		.then(function (latestSession) {
			if (latestSession) {
				_.set(DCB, 'sessionName', latestSession.name);
			}
		})
		.catch(function (err) {
			console.log('line43', err);
		})
	;
});

_.set(DCB, 'socketCallback', function (serverName, cbArray) {
	if(!_.get(DCB, 'sessionName')) {
		DCB.getLatestSession(serverName);
	} else {
		_.forEach(_.get(cbArray, 'que', []), function (queObj) {
			if (_.get(queObj, 'action') === 'players') {
				playersEvent.processPlayerEvent(serverName, _.get(DCB, 'sessionName'), queObj.data);
			}

			if (_.get(queObj, 'action') === 'friendly_fire') {
				friendlyFireEvent
			}

			if (_.get(queObj, 'action') === 'self_kill') {
				selfKillEvent
			}

			if (_.get(queObj, 'action') === 'connect') {
				connectEvent
			}

			if (_.get(queObj, 'action') === 'disconnect') {
				disconnectEvent
			}

		});
	}
});

