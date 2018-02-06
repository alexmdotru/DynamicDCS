const _ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const groupController = require('../spawn/group');
const DCSLuaCommands = require('../player/DCSLuaCommands');

var mesg;
var masterUnitCount;
var lastUnitCount;
var isServerFresh = true;
var stuckDetect = 0;
var stuckThreshold = 30;
exports.isServerSynced = false;
exports.isSyncLockdownMode = false; //lock all processes out until server fully syncs


_.set(exports, 'syncType', function (serverName, serverUnitCount) {
	var remappedunits = {};
	dbMapServiceController.unitActions('readStd', serverName, {dead: false, type: {$ne: 'UAZ-469'}})
		.then(function (units) {
			if (serverUnitCount === 0) { //server is empty
				exports.isServerSynced = false;
				isServerFresh = true;
				if (!exports.isSyncLockdownMode) {
					exports.isSyncLockdownMode = true; // lock down all traffic until sync is complete
					if (units.length === 0) { // DB is empty
						console.log('DB & Server is empty of Units, Spawn New Units');
						masterUnitCount = groupController.spawnNewMapGrps(serverName) //respond with server spawned num
					} else { // DB is FULL
						//might have filter units to be spawned, mark others as dead head of time
						var filterStructure = _.filter(units, {category: 'STRUCTURE'});
						var filterGround = _.filter(units, {category: 'GROUND'});
						masterUnitCount = filterStructure.length + filterGround.length;
						console.log('DB has ' + units.length + ' Units, Respawn Them');
						_.forEach(units, function (unit) {
							var curDead;
							var curGrpName = _.get(unit, 'groupName');
							if (_.get(unit, 'category') === 'GROUND') {
								_.set(remappedunits, [curGrpName], _.get(remappedunits, [curGrpName], []));
								remappedunits[curGrpName].push(unit);
							} else if (_.get(unit, 'category') === 'STRUCTURE') {
								groupController.spawnLogisticCmdCenter(serverName, unit);
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
					}
				}
			} else {
				if (isServerFresh) { // server is fresh
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
						if (!exports.isServerSynced && units.length > 300) {
							mesg = 'Server units are Synced, Slots Now Open!';
							console.log(mesg);
							DCSLuaCommands.sendMesgChatWindow(serverName, mesg);
							exports.isServerSynced = true;
							isServerFresh = false;
							DCSLuaCommands.setIsOpenSlotFlag(serverName, 1);
						}
					}
				} else { // server has units on it
					if (units.length !== serverUnitCount) { // db doesnt match server
						if (lastUnitCount === serverUnitCount) {
							if (stuckDetect > 5) {
								mesg = 'STUCK|' + stuckDetect + '|F|' + units.length + ':' + serverUnitCount + ':' + exports.isServerSynced + ':' + exports.isSyncLockdownMode;
							} else {
								mesg = 'SYNCING|R|' + units.length + ':' + serverUnitCount;
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
							mesg = 'SYNCING|R|' + units.length + ':' + serverUnitCount;
						}
						exports.isServerSynced = true;
						console.log(mesg);
						// DCSLuaCommands.sendMesgChatWindow(serverName, mesg);
						// exports.isServerSynced = true;
					} else {
						if (!exports.isServerSynced && units.length > 300) {
							mesg = 'Server units Synced';
							console.log(mesg);
							//DCSLuaCommands.sendMesgChatWindow(serverName, mesg);
							exports.isServerSynced = true;
							DCSLuaCommands.setIsOpenSlotFlag(serverName, 1);
						}
					}
				}
			}
		})
		.catch(function (err) {
			console.log('erroring line59: ', err);
		})
	;
});
