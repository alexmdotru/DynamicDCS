const _ = require('lodash');
const DCSSocket = require('../../controllers/net/DCSSocket');
const dbSystemServiceController = require('../../controllers/db/dbSystemService');
const dbMapServiceController = require('../../controllers/db/dbMapService');
const menuCmdsController = require('../../controllers/menu/menuCmds');
const groupController = require('../../controllers/spawn/group');
const unitsStaticsController = require('../../controllers/serverToDbSync/unitsStatics');
const staticCratesController = require('../../controllers/action/staticCrates');
const airbaseSyncController = require('../../controllers/serverToDbSync/airbaseSync');
const sychrontronController = require('../../controllers/sychronize/Sychrontron');
const recoveryController = require('../../controllers/sychronize/recovery');
const jtacController = require('../../controllers/action/jtac');
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
const processTimedOneSec = require('../../controllers/timedEvents/oneSec');
const processTimedFiveSecs = require('../../controllers/timedEvents/fiveSecs');
const processTimedThirtySecs = require('../../controllers/timedEvents/thirtySecs');
const processTimedTenMinutes = require('../../controllers/timedEvents/tenMinutes');

var CCB = {};

//config
_.assign(CCB, {
	serverName: 'DDCS-Hardcore-PG',
	serverIP: '127.0.0.1',
	serverPort: '3001',
	queName: 'clientArray',
	db: {
		systemHost: 'localhost',
		systemDatabase: 'DynamicDCS',
		dynamicHost: 'localhost',
		dynamicDatabase: 'DDCS-Hardcore-PG'
	},
	sec: 1000,
	twoSec: 2 * 1000,
	fiveSecs: 5 * 1000,
	thirtySecs: 30 * 1000,
	tenMinutes: 10 * 60 * 1000
});

dbSystemServiceController.connectSystemDB(CCB.db.systemHost, CCB.db.systemDatabase);
dbMapServiceController.connectMapDB(CCB.db.dynamicHost, CCB.db.dynamicDatabase);

//checks to see if socket needs restarting every 3 secs
setInterval(function () {
	if (CCB.DCSSocket) {
		if (CCB.DCSSocket.connOpen) {
			console.log('Connecting to ' + CCB.serverName + ' Frontend');
			_.set(CCB, 'sessionName', '');
			sychrontronController.isSyncLockdownMode = false;
			dbMapServiceController.cmdQueActions('removeall', CCB.serverName, {})
				.then(function () {
					CCB.DCSSocket.connSocket();
				})
				.catch(function (err) {
					console.log('line62', err);
				})
			;
		}
	} else {
		CCB.DCSSocket = new DCSSocket.createSocket(CCB.serverName, CCB.serverIP, CCB.serverPort, CCB.queName, CCB.socketCallback);
	}
}, 10 * 1000);

_.set(CCB, 'getLatestSession', function (serverName, serverEpoc, startAbs, curAbs) {
	console.log('sn: ', serverEpoc, startAbs, curAbs, _.get(CCB, 'sessionName'));
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
			console.log('set new session: ', sessionName);
			_.set(CCB, ['sessionName'], sessionName);
			_.set(CCB, ['curAbsTime'], curAbs);
			console.log('set new session');
			dbMapServiceController.statSessionActions('save', serverName, newSession)
				.catch(function (err) {
					console.log('line49', err);
				})
			;
		} else {
			console.log('use existing session: ', sessionName);
			dbMapServiceController.statSessionActions('update', serverName, newSession)
				.catch(function (err) {
					console.log('line55', err);
				})
			;
		}
	}
});

_.set(CCB, 'socketCallback', function (serverName, cbArray) {
	console.log('CB: ', cbArray.que);
	_.set(CCB, 'curServerUnitCnt', cbArray.unitCount);
	if(!_.get(CCB, 'sessionName')) {
		CCB.getLatestSession(serverName, cbArray.epoc, cbArray.startAbsTime,  cbArray.curAbsTime);
	} else {
		_.forEach(_.get(cbArray, 'que', []), function (queObj) {
			if ((_.get(queObj, 'action') === 'C') || (_.get(queObj, 'action') === 'U') || (_.get(queObj, 'action') === 'D'))  {
				unitsStaticsController.processUnitUpdates(serverName, CCB.sessionName, queObj);
			}

			if (_.get(queObj, 'action') === 'airbaseC' || _.get(queObj, 'action') === 'airbaseU') {
				console.log('action: ', _.get(queObj, 'action'), queObj);
				airbaseSyncController.processAirbaseUpdates(serverName, queObj);
			}

			if ((_.get(queObj, 'action') === 'f10Menu') && sychrontronController.isServerSynced) {
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

			if ((_.get(queObj, 'action') === 'S_EVENT_HIT') && sychrontronController.isServerSynced) {
				processEventHit.processEventHit(serverName, CCB.sessionName, queObj);
			}

			if ((_.get(queObj, 'action') === 'S_EVENT_TAKEOFF') && sychrontronController.isServerSynced) {
				processEventTakeoff.processEventTakeoff(serverName, CCB.sessionName, queObj);
			}

			if ((_.get(queObj, 'action') === 'S_EVENT_LAND') && sychrontronController.isServerSynced) {
				processEventLand.processEventLand(serverName, CCB.sessionName, queObj);
			}

			if ((_.get(queObj, 'action') === 'S_EVENT_EJECTION') && sychrontronController.isServerSynced) {
				processEventEjection.processEventEjection(serverName, CCB.sessionName, queObj);
			}

			if ((_.get(queObj, 'action') === 'S_EVENT_CRASH') && sychrontronController.isServerSynced) {
				processEventCrash.processEventCrash(serverName, CCB.sessionName, queObj);
			}

			if ((_.get(queObj, 'action') === 'S_EVENT_DEAD') && sychrontronController.isServerSynced) {
				processEventDead.processEventDead(serverName, CCB.sessionName, queObj);
			}

			if ((_.get(queObj, 'action') === 'S_EVENT_PILOT_DEAD') && sychrontronController.isServerSynced) {
				processEventPilotDead.processEventPilotDead(serverName, CCB.sessionName, queObj);
			}

			if ((_.get(queObj, 'action') === 'S_EVENT_REFUELING') && sychrontronController.isServerSynced) {
				processEventRefueling.processEventRefueling(serverName, CCB.sessionName, queObj);
			}

			if ((_.get(queObj, 'action') === 'S_EVENT_REFUELING_STOP') && sychrontronController.isServerSynced) {
				processEventRefuelingStop.processEventRefuelingStop(serverName, CCB.sessionName, queObj);
			}
/*
			if ((_.get(queObj, 'action') === 'S_EVENT_BIRTH') && sychrontronController.isServerSynced) {
				processEventBirth.processEventBirth(serverName, CCB.sessionName, queObj);
			}
*/
			if ((_.get(queObj, 'action') === 'S_EVENT_PLAYER_ENTER_UNIT') && sychrontronController.isServerSynced) {
				processEventPlayerEnterUnit.processEventPlayerEnterUnit(serverName, CCB.sessionName, queObj);
			}

			if ((_.get(queObj, 'action') === 'S_EVENT_PLAYER_LEAVE_UNIT') && sychrontronController.isServerSynced) {
				processEventPlayerLeaveUnit.processEventPlayerLeaveUnit(serverName, CCB.sessionName, queObj);
			}

			// line of sight callback from server
			if ((_.get(queObj, 'action') === 'LOSVISIBLEUNITS') && sychrontronController.isServerSynced) {
				jtacController.processLOSEnemy(serverName, queObj);
			}

			if ((_.get(queObj, 'action') === 'CRATEOBJUPDATE') && sychrontronController.isServerSynced) {
				staticCratesController.processStaticCrate(serverName, queObj);
			}

			if (_.get(queObj, 'action') === 'unitsAlive') {
				recoveryController.sendMissingUnits(serverName, _.get(queObj, 'data'))
			}
		});
	}
});

setInterval(function () {
	if (!_.get(CCB, ['DCSSocket', 'connOpen'], true)) {
		processTimedOneSec.processOneSecActions(CCB.serverName, sychrontronController.isServerSynced);
	}
}, CCB.sec);

setInterval(function () {
	if (!_.get(CCB, ['DCSSocket', 'connOpen'], true)) {
		processTimedFiveSecs.processFiveSecActions(CCB.serverName, sychrontronController.isServerSynced);
	}
}, CCB.fiveSecs);

setInterval(function () {
	if (!_.get(CCB, ['DCSSocket', 'connOpen'], true)) {
		processTimedThirtySecs.processThirtySecActions(CCB.serverName, sychrontronController.isServerSynced);
	}
}, CCB.thirtySecs);

setInterval(function () {
	if (!_.get(CCB, ['DCSSocket', 'connOpen'], true)) {
		processTimedTenMinutes.processTenMinuteActions(CCB.serverName, sychrontronController.isServerSynced);
	}
}, CCB.tenMinutes);


setInterval(function () {
	if (groupController.bases) {
		if (!_.get(CCB, ['DCSSocket', 'connOpen'], true)) {
			sychrontronController.syncType(CCB.serverName, _.get(CCB, 'curServerUnitCnt', 38) - 38);
		}
	}
}, 1 * 1000);

groupController.initDbs(CCB.serverName);
