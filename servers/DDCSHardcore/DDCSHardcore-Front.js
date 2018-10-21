const _ = require('lodash');
const constants = require('../../controllers/constants');
const DCSSocket = require('../../controllers/net/DCSSocket');
const masterDBController = require('../../controllers/db/masterDB');
const menuCmdsController = require('../../controllers/menu/menuCmds');
const unitsStaticsController = require('../../controllers/serverToDbSync/unitsStatics');
const staticCratesController = require('../../controllers/action/staticCrates');
const airbaseSyncController = require('../../controllers/serverToDbSync/airbaseSync');
const sychrontronController = require('../../controllers/sychronize/Sychrontron');
const recoveryController = require('../../controllers/sychronize/recovery');
const jtacController = require('../../controllers/action/jtac');
const serverTimerController = require('../../controllers/action/serverTimer');
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

//config
var masterServer = '192.168.44.60';
var serverName = 'DDCSHardcore';

masterDBController.initDB(serverName, masterServer);

constants.initServer(serverName)
	.then(function () {

//checks to see if socket needs restarting every 3 secs
		setInterval(function () {
			if (exports.DCSSocket) {
				if (exports.DCSSocket.connOpen) {
					console.log('Connecting to ' + serverName + ' Frontend');
					_.set(exports, 'sessionName', '');
					sychrontronController.isSyncLockdownMode = false;
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
			}
		}, 3 * _.get(constants, 'time.sec'));

		_.set(exports, 'getLatestSession', function (serverName, serverEpoc, startAbs, curAbs) {
			console.log('sn: ', serverEpoc, startAbs, curAbs, _.get(exports, 'sessionName'));
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
				if (sessionName !== _.get(exports, ['sessionName'], '') || _.get(exports, ['curAbsTime'], 0) > curAbs) {
					console.log('set new session: ', sessionName);
					_.set(exports, ['sessionName'], sessionName);
					_.set(exports, ['curAbsTime'], curAbs);
					console.log('set new session');
					masterDBController.statSessionActions('save', serverName, newSession)
						.catch(function (err) {
							console.log('line49', err);
						})
					;
				} else {
					console.log('use existing session: ', sessionName);
					masterDBController.statSessionActions('update', serverName, newSession)
						.catch(function (err) {
							console.log('line55', err);
						})
					;
				}
			}
		});

		_.set(exports, 'socketCallback', function (serverName, cbArray) {
			_.assign(exports, {
				curAbsTime: cbArray.curAbsTime,
				realServerSecs: cbArray.curAbsTime - cbArray.startAbsTime,
				startAbsTime: cbArray.startAbsTime
			});
			if (!sychrontronController.isServerSynced) {
				console.log('SYNC: ', sychrontronController.isServerSynced);
			}
			// console.log('CB: ', cbArray.que);
			_.set(exports, 'curServerUnitCnt', cbArray.unitCount);
			if(!_.get(exports, 'sessionName')) {
				exports.getLatestSession(serverName, cbArray.epoc, cbArray.startAbsTime,  cbArray.curAbsTime);
			} else {
				_.forEach(_.get(cbArray, 'que', []), function (queObj) {
					if ((_.get(queObj, 'action') === 'C') || (_.get(queObj, 'action') === 'U') || (_.get(queObj, 'action') === 'D'))  {
						// console.log('CB: ', queObj.data);
						unitsStaticsController.processUnitUpdates(serverName, exports.sessionName, queObj);
					}

					if (_.get(queObj, 'action') === 'airbaseC' || _.get(queObj, 'action') === 'airbaseU') {
						airbaseSyncController.processAirbaseUpdates(serverName, queObj);
					}

					if ((_.get(queObj, 'action') === 'f10Menu') && sychrontronController.isServerSynced) {
						// console.log('CB: ', queObj);
						menuCmdsController.menuCmdProcess(serverName, exports.sessionName, queObj);
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
						processEventHit.processEventHit(serverName, exports.sessionName, queObj);
					}

					if ((_.get(queObj, 'action') === 'S_EVENT_TAKEOFF') && sychrontronController.isServerSynced) {
						processEventTakeoff.processEventTakeoff(serverName, exports.sessionName, queObj);
					}

					if ((_.get(queObj, 'action') === 'S_EVENT_LAND') && sychrontronController.isServerSynced) {
						processEventLand.processEventLand(serverName, exports.sessionName, queObj);
					}

					if ((_.get(queObj, 'action') === 'S_EVENT_EJECTION') && sychrontronController.isServerSynced) {
						processEventEjection.processEventEjection(serverName, exports.sessionName, queObj);
					}

					if ((_.get(queObj, 'action') === 'S_EVENT_CRASH') && sychrontronController.isServerSynced) {
						processEventCrash.processEventCrash(serverName, exports.sessionName, queObj);
					}

					if ((_.get(queObj, 'action') === 'S_EVENT_DEAD') && sychrontronController.isServerSynced) {
						processEventDead.processEventDead(serverName, exports.sessionName, queObj);
					}

					if ((_.get(queObj, 'action') === 'S_EVENT_PILOT_DEAD') && sychrontronController.isServerSynced) {
						processEventPilotDead.processEventPilotDead(serverName, exports.sessionName, queObj);
					}

					if ((_.get(queObj, 'action') === 'S_EVENT_REFUELING') && sychrontronController.isServerSynced) {
						processEventRefueling.processEventRefueling(serverName, exports.sessionName, queObj);
					}

					if ((_.get(queObj, 'action') === 'S_EVENT_REFUELING_STOP') && sychrontronController.isServerSynced) {
						processEventRefuelingStop.processEventRefuelingStop(serverName, exports.sessionName, queObj);
					}
					if ((_.get(queObj, 'action') === 'S_EVENT_BIRTH') && sychrontronController.isServerSynced) {
						processEventBirth.processEventBirth(serverName, exports.sessionName, queObj);
					}
					if ((_.get(queObj, 'action') === 'S_EVENT_PLAYER_ENTER_UNIT') && sychrontronController.isServerSynced) {
						processEventPlayerEnterUnit.processEventPlayerEnterUnit(serverName, exports.sessionName, queObj);
					}

					if ((_.get(queObj, 'action') === 'S_EVENT_PLAYER_LEAVE_UNIT') && sychrontronController.isServerSynced) {
						processEventPlayerLeaveUnit.processEventPlayerLeaveUnit(serverName, exports.sessionName, queObj);
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
			if (!_.get(exports, ['DCSSocket', 'connOpen'], true)) {
				processTimedOneSec.processOneSecActions(serverName, sychrontronController.isServerSynced);
			}
		}, _.get(constants, 'time.sec'));

		setInterval(function () {
			if (!_.get(exports, ['DCSSocket', 'connOpen'], true)) {
				processTimedFiveSecs.processFiveSecActions(serverName, sychrontronController.isServerSynced);
			}
		}, _.get(constants, 'time.fiveSecs'));

		setInterval(function () {
			if (!_.get(exports, ['DCSSocket', 'connOpen'], true)) {
				processTimedThirtySecs.processThirtySecActions(serverName, sychrontronController.isServerSynced);
				serverTimerController.processTimer(serverName, _.get(exports, 'realServerSecs', 0));
			} else {
				serverTimerController.timerObj = {}
			}
		}, _.get(constants, 'time.thirtySecs'));

		setInterval(function () {
			if (_.get(exports, 'sessionName')) {
				masterDBController.statSessionActions('update', serverName, {
					_id: _.get(exports, 'sessionName'),
					name: _.get(exports, 'sessionName'),
					startAbsTime: _.get(exports, 'startAbsTime'),
					curAbsTime: _.get(exports, 'curAbsTime')
				})
					.catch(function (err) {
						console.log('line240', err);
					})
				;
			}
		}, _.get(constants, 'time.oneMin'));

		setInterval(function () {
			if (!_.get(exports, ['DCSSocket', 'connOpen'], true)) {
				processTimedTenMinutes.processTenMinuteActions(serverName, sychrontronController.isServerSynced);
			}
		}, _.get(constants, 'time.tenMinutes'));


		setInterval(function () {
			if (constants.bases) {
				if (!_.get(exports, ['DCSSocket', 'connOpen'], true)) {
					sychrontronController.syncType(serverName, _.get(exports, 'curServerUnitCnt', -1));
				}
			}
		}, _.get(constants, 'time.sec'));
	})
	.catch(function (err) {
		console.log('line267', err);
	})
;
