const _ = require('lodash');
const constants = require('../../controllers/constants');
const DCSSocket = require('../../controllers/net/DCSSocket');
const dbSystemRemoteController = require('../../controllers/db/dbSystemRemote');
const dbMapServiceController = require('../../controllers/db/dbMapService');
const playersEvent = require('../../controllers/events/backend/players');
const friendlyFireEvent = require('../../controllers/events/backend/friendlyFire');
const selfKillEvent = require('../../controllers/events/backend/selfKill');
const connectEvent = require('../../controllers/events/backend/connect');
const disconnectEvent = require('../../controllers/events/backend/disconnect');
const commsUserProcessing = require('../../controllers/discordBot/commsUserProcessing');

//config
var commsCounter = 0;
var isDiscordAllowed = true;
var masterServer = '192.168.44.60';
var serverName = 'DDCSStandard';


dbSystemRemoteController.connectSystemRemoteDB(masterServer, 'DDCS');
dbMapServiceController.connectMapDB('localhost', serverName);

constants.initServer(serverName)
	.then(function () {
		//checks to see if socket needs restarting every 3 secs
		setInterval(function () {
			if (exports.DCSSocket) {
				if (exports.DCSSocket.connOpen) {
					console.log('Connecting to ' + serverName + ' Backend');
					exports.DCSSocket.connSocket();
				}
			} else {
				exports.DCSSocket = new DCSSocket.createSocket(serverName, 'localhost', _.get(constants, 'config.dcsGameGuiPort'), 'gameGuiArray', exports.socketCallback, 'backend');
			}
		}, 5 * 1000);

		_.set(exports, 'getLatestSession', function (serverName) {
			dbMapServiceController.statSessionActions('readLatest', serverName, {})
				.then(function (latestSession) {
					if (latestSession) {
						if (_.get(exports, 'sessionName') !== latestSession.name) {
							console.log('New Session: ', latestSession);
							_.set(exports, 'sessionName', latestSession.name);
						}
					}
				})
				.catch(function (err) {
					console.log('line43', err);
				})
			;
		});

		_.set(exports, 'socketCallback', function (serverName, cbArray) {
			// console.log('BB: ', cbArray.que);
			exports.getLatestSession(serverName);
			_.forEach(_.get(cbArray, 'que', []), function (queObj) {
				if (_.get(queObj, 'action') === 'players') {
					playersEvent.processPlayerEvent(serverName, exports.sessionName, queObj);
					if (commsCounter > 59) {
						commsUserProcessing.checkForComms(serverName, isDiscordAllowed, queObj.data);
						commsCounter = 0;
					}
					commsCounter++;
					// console.log('PLAYERS: ', queObj.data);
				}

				if (_.get(queObj, 'action') === 'friendly_fire') {
					friendlyFireEvent.processFriendlyFire(serverName, exports.sessionName, queObj);
				}

				if (_.get(queObj, 'action') === 'self_kill') {
					selfKillEvent.processSelfKill(serverName, exports.sessionName, queObj);
				}

				if (_.get(queObj, 'action') === 'connect') {
					connectEvent.processConnect(serverName, exports.sessionName, queObj);
				}

				if (_.get(queObj, 'action') === 'disconnect') {
					disconnectEvent.processDisconnect(serverName, exports.sessionName, queObj);
				}

			});
		});
	})
	.catch(function (err) {
		console.log('line61', err);
	})
;

