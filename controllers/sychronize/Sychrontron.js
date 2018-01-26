const _ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const groupController = require('../spawn/group');

var masterUnitCount;
var remappedunits = {};
var isServerFresh = false;
exports.isServerSynced = false;
exports.isSyncLockdownMode = false; //lock all processes out until server fully syncs

_.set(exports, 'syncType', function (serverName, serverUnitCount) {
	dbMapServiceController.unitActions('read', serverName, {dead: false})
		.then(function (units) {
			if (serverUnitCount === 0) { //server is empty
				isServerFresh = true;
				if (!exports.isSyncLockdownMode) {
					exports.isSyncLockdownMode = true; // lock down all traffic until sync is complete
					if (units.length === 0) { // DB is empty
						console.log('DB & Server is empty of Units, Spawn New Units');
						groupController.spawnNewMapGrps(serverName) //respond with server spawned num
							.then(function (unitsSpawned) {
								masterUnitCount = unitsSpawned;
							})
							.catch(function (err) {
								console.log('erroring line24: ', err);
							})
						;
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
									_id: parseFloat(_.get(unit, 'unitId')),
									unitId: _.get(unit, 'unitId'),
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
					if (masterUnitCount) {
						if ((serverUnitCount !== masterUnitCount) ||  (units.length !== masterUnitCount)) {
							console.log('FR T:' + masterUnitCount + ' D:' + units.length + ' S:' + serverUnitCount);
							exports.isServerSynced = false;
						} else {
							if (!exports.isServerSynced) {
								console.log('Server is Synced');
								exports.isServerSynced = true;
							}
						}
					}
				} else { // server has units on it
					masterUnitCount = serverUnitCount;
					if (units.length !== masterUnitCount) { // db doesnt match server
						console.log('RS T:' + masterUnitCount + ' D:' + units.length + ' S:' + serverUnitCount);
						exports.isServerSynced = false;
					} else {
						if (!exports.isServerSynced) {
							console.log('Server is Synced');
							exports.isServerSynced = true;
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
