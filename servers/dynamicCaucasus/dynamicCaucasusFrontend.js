const _ = require('lodash');
const DCSSocket = require('../../controllers/net/DCSSocket');
const dbSystemServiceController = require('../../controllers/db/dbSystemService');
const dbMapServiceController = require('../../controllers/db/dbMapService');
const menuCmdsController = require('../../controllers/menu/menuCmds');

const unitsStaticsController = require('../../controllers/serverToDbSync/unitsStatics');
const airbaseSyncController = require('../../controllers/serverToDbSync/airbaseSync');

const processEventHit = require('../../controllers/events/frontend/S_EVENT_HIT');
const processEventTakeoff = require('../../controllers/events/frontend/S_EVENT_TAKEOFF');
const processEventLand = require('../../controllers/events/frontend/S_EVENT_LAND');
const processEventEjection = require('../../controllers/events/frontend/S_EVENT_EJECTION');
const processEventCrash = require('../../controllers/events/frontend/S_EVENT_CRASH');
const processEventDead = require('../../controllers/events/frontend/S_EVENT_DEAD');
const processEventPilotDead = require('../../controllers/events/frontend/S_EVENT_PILOT_DEAD');
const processEventRefueling = require('../../controllers/events/frontend/S_EVENT_REFUELING');
const processEventRefuelingStop = require('../../controllers/events/frontend/S_EVENT_REFUELING_STOP');
const processEventBirth = require('../../controllers/events/frontend/S_EVENT_BIRTH');
const processEventPlayerEnterUnit = require('../../controllers/events/frontend/S_EVENT_PLAYER_ENTER_UNIT');
const processEventPlayerLeaveUnit = require('../../controllers/events/frontend/S_EVENT_PLAYER_LEAVE_UNIT');

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

dbSystemServiceController.connectSystemDB(CCB.db.systemHost, CCB.db.systemDatabase);
dbMapServiceController.connectMapDB(CCB.db.dynamicHost, CCB.db.dynamicDatabase);

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

			if (_.get(queObj, 'action') === 'f10Menu') {
				menuCmdsController.menuCmdProcess(serverName, CCB.sessionName, queObj);
			}

			/*
			//Cmd Response
			if (_.get(queObj, 'action') === 'CMDRESPONSE') {
				_.set(queObj, 'sessionName', sessionName);
				//send response straight to client id
				curServers[serverName].updateQue.q1.push(_.cloneDeep(queObj));
				curServers[serverName].updateQue.q2.push(_.cloneDeep(queObj));
				curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
			}
			*/

			/*
			//mesg
			if (_.get(queObj, 'action') === 'MESG') {
				_.set(queObj, 'sessionName', sessionName);
				// console.log('mesg: ', queObj);
				if (_.get(queObj, 'data.playerID')) {
					if (_.isNumber(_.get(_.find(curServers[serverName].serverObject.players, {'id': _.get(queObj, 'data.playerID')}), 'side', 0))) {
						curServers[serverName].updateQue['q' + _.get(_.find(curServers[serverName].serverObject.players, {'id': _.get(queObj, 'data.playerID')}), 'side', 0)]
							.push(_.cloneDeep(queObj));
						curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
					}
				}
			}
			*/

			if (_.get(queObj, 'action') === 'S_EVENT_HIT') {
				processEventHit.processEventHit(serverName, CCB.sessionName, eventObj);
			}

			if (_.get(queObj, 'action') === 'S_EVENT_TAKEOFF') {
				processEventTakeoff.processEventTakeoff(serverName, CCB.sessionName, eventObj);
			}

			if (_.get(queObj, 'action') === 'S_EVENT_LAND') {
				processEventLand.processEventLand(serverName, CCB.sessionName, eventObj);
			}

			if (_.get(queObj, 'action') === 'S_EVENT_EJECTION') {
				processEventEjection.processEventEjection(serverName, CCB.sessionName, eventObj);
			}

			if (_.get(queObj, 'action') === 'S_EVENT_CRASH') {
				processEventCrash.processEventCrash(serverName, CCB.sessionName, eventObj);
			}

			if (_.get(queObj, 'action') === 'S_EVENT_DEAD') {
				processEventDead.processEventDead(serverName, CCB.sessionName, eventObj);
			}

			if (_.get(queObj, 'action') === 'S_EVENT_PILOT_DEAD') {
				processEventPilotDead.processEventPilotDead(serverName, CCB.sessionName, eventObj);
			}

			if (_.get(queObj, 'action') === 'S_EVENT_REFUELING') {
				processEventRefueling.processEventRefueling(serverName, CCB.sessionName, eventObj);
			}

			if (_.get(queObj, 'action') === 'S_EVENT_REFUELING_STOP') {
				processEventRefuelingStop.processEventRefuelingStop(serverName, CCB.sessionName, eventObj);
			}

			if (_.get(queObj, 'action') === 'S_EVENT_BIRTH') {
				processEventBirth.processEventBirth(serverName, CCB.sessionName, eventObj);
			}

			if (_.get(queObj, 'action') === 'S_EVENT_PLAYER_ENTER_UNIT') {
				processEventPlayerEnterUnit.processEventPlayerEnterUnit(serverName, CCB.sessionName, eventObj);
			}

			if (_.get(queObj, 'action') === 'S_EVENT_PLAYER_LEAVE_UNIT') {
				processEventPlayerLeaveUnit.processEventPlayerLeaveUnit(serverName, CCB.sessionName, eventObj);
			}
			console.log('queObj: ', queObj);
		});
	}
});
