const _ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const groupController = require('../spawn/group');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const menuUpdateController = require('../menu/menuUpdate');
const crateController = require('../spawn/crate');
const sideLockController = require('../action/sideLock');
const taskController = require('../action/task');
const baseSpawnFlagsController = require('../action/baseSpawnFlags');

var mesg;
var masterUnitCount;
var lastUnitCount;
var isServerFresh = false;
var stuckThreshold = 30;
exports.isServerSynced = false;
exports.isSyncLockdownMode = false; //lock all processes out until server fully syncs
exports.processInstructions = false;


_.set(exports, 'syncType', function (serverName, serverUnitCount) {
	var remappedunits = {};
	if (serverUnitCount > -1) {
		// console.log('start: ', serverName, serverUnitCount);
		dbMapServiceController.unitActions('readStd', serverName, {dead: false})
			.then(function (units) {
				if (serverUnitCount === 0) { //server is empty
					taskController.ewrUnitsActivated = {};
					exports.isServerSynced = false;
					isServerFresh = true;
					if (!exports.isSyncLockdownMode) {
						exports.isSyncLockdownMode = true; // lock down all traffic until sync is complete
						dbMapServiceController.cmdQueActions('removeall', serverName, {})
							.then(function () {
								if (units.length === 0) { // DB is empty
									console.log('DB & Server is empty of Units, Spawn New Units');
									masterUnitCount = groupController.spawnNewMapGrps(serverName); //respond with server spawned num
									exports.processInstructions = true;
									console.log('processed Instructons 1: ', exports.processInstructions);
								} else { // DB is FULL
									console.log('DB has ' + units.length + ' Units, Respawn Them');
									var filterStructure = _.filter(units, {category: 'STRUCTURE'});
									var filterGround = _.filter(units, {category: 'GROUND'});
									masterUnitCount = filterStructure.length + filterGround.length;
									_.forEach(units, function (unit) {
										var curDead;
										var curGrpName = _.get(unit, 'groupName');
										if ((_.get(unit, 'category') === 'GROUND') && !_.get(unit, 'isTroop', false)) {
											_.set(remappedunits, [curGrpName], _.get(remappedunits, [curGrpName], []));
											remappedunits[curGrpName].push(unit);
										} else if (_.get(unit, 'category') === 'STRUCTURE') {
											groupController.spawnLogisticCmdCenter(serverName, unit, true);
										} else {
											curDead = {
												_id: _.get(unit, 'name'),
												name: _.get(unit, 'name'),
												dead: true
											};
											dbMapServiceController.unitActions('update', serverName, curDead)
												.catch(function (err) {
													console.log('erroring line36: ', err);
												})
											;
										}
									});
									_.forEach(remappedunits, function (group) {
										groupController.spawnGroup(serverName, group)
									});
									if(!menuUpdateController.virtualCrates) {
										dbMapServiceController.staticCrateActions('read', serverName, {})
											.then(function(staticCrates) {
												_.forEach(staticCrates, function (crateObj) {
													crateController.spawnLogiCrate(serverName, crateObj, false);
												});
											})
											.catch(function (err) {
												console.log('line 70: ', err);
											})
										;
									}
								}
								exports.processInstructions = true;
								console.log('processed Instructons 2: ', exports.processInstructions);
							})
							.catch(function (err) {
								console.log('line 84: ', err);
							})
						;
					} else {
						console.log('syncro mode is on lockdown: ', exports.isSyncLockdownMode);
					}
				} else {
					if (isServerFresh) { // server is fresh
						taskController.ewrUnitsActivated = {};
						if (exports.processInstructions) {
							if (serverUnitCount !== units.length) {
								if (lastUnitCount === serverUnitCount) {
									if (stuckDetect > 5) {
										mesg = 'STUCK|' + stuckDetect + '|F|' + units.length + ':' + serverUnitCount + ':' + exports.isServerSynced + ':' + exports.isSyncLockdownMode;
									} else {
										mesg = 'SYNCING|F|' + units.length + ':' + serverUnitCount;
									}
									if (stuckDetect > stuckThreshold) {
										dbMapServiceController.cmdQueActions('save', serverName, {
											queName: 'clientArray',
											actionObj: {action: "GETUNITSALIVE"},
										});
										stuckDetect = 0;
									} else {
										stuckDetect++;
									}
								} else {
									stuckDetect = 0;
									lastUnitCount = serverUnitCount;
									mesg = 'SYNCING|F|' + units.length + ':' + serverUnitCount;
								}
								console.log(mesg);
								DCSLuaCommands.sendMesgChatWindow(serverName, mesg);
								exports.isServerSynced = false;
							} else {
								if (!exports.isServerSynced && units.length > 200) {
									mesg = 'Server units are Synced, Slots Now Open!';
									console.log(mesg);
									DCSLuaCommands.sendMesgChatWindow(serverName, mesg);
									exports.isServerSynced = true;
									isServerFresh = false;
									DCSLuaCommands.setIsOpenSlotFlag(serverName, 1);
									sideLockController.setSideLockFlags(serverName);
									baseSpawnFlagsController.setbaseSides(serverName);
								} else {
									console.log('failing  !exports.isServerSynced && units.length > 100', !exports.isServerSynced, ' && ', units.length > 100);
								}
							}
						} else {
							console.log('No Sync Instructions to be processed', exports.processInstructions);
						}
					} else { // server has units on it
						if (units.length !== serverUnitCount) { // db doesnt match server
							if (lastUnitCount === serverUnitCount) {
								if (stuckDetect > 5) {
									mesg = 'STUCK|' + stuckDetect + '|R1|' + units.length + ':' + serverUnitCount + ':' + exports.isServerSynced + ':' + exports.isSyncLockdownMode;
								} else {
									mesg = 'SYNCING|R1|' + units.length + ':' + serverUnitCount;
								}
								if (stuckDetect > stuckThreshold) {
									dbMapServiceController.cmdQueActions('save', serverName, {
										queName: 'clientArray',
										actionObj: {action: "GETUNITSALIVE"},
									});
									stuckDetect = 0;
								} else {
									stuckDetect++;
								}
							} else {
								stuckDetect = 0;
								lastUnitCount = serverUnitCount;
								mesg = 'SYNCING|R2|' + units.length + ':' + serverUnitCount;
							}
							exports.isServerSynced = true;
							console.log(mesg);
							// DCSLuaCommands.sendMesgChatWindow(serverName, mesg);
							// exports.isServerSynced = true;
						} else {
							if (!exports.isServerSynced && units.length > 100) {
								mesg = 'Server units Synced';
								console.log(mesg);
								//DCSLuaCommands.sendMesgChatWindow(serverName, mesg);
								exports.isServerSynced = true;
								DCSLuaCommands.setIsOpenSlotFlag(serverName, 1);
								baseSpawnFlagsController.setbaseSides(serverName);
							}
						}
					}
				}
			})
			.catch(function (err) {
				console.log('erroring line59: ', err);
			})
		;
	}
});
