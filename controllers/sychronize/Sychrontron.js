const _ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const groupController = require('../spawn/group');

var remappedunits = {};
var isFreshServer = false; //server is generating new units from scratch db empty, server empty
exports.isSyncLockdownMode = false; //lock all processes out until server fully syncs

_.set(exports, 'syncType', function (serverName, serverUnitCount) {
	dbMapServiceController.unitActions('read', serverName, {dead: false})
		.then(function (units) {
			if (!exports.isSyncLockdownMode) {
				exports.isSyncLockdownMode = true; //lockdown until sync is complete!
				if (serverUnitCount === 0) {
					if (units.length === 0) {
						console.log('DB & Server is empty of Units, Spawn New Units');
						isFreshServer = true;
						groupController.spawnNewMapGrps(serverName);
					} else {
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
				} else {
					if (serverUnitCount !== units.length) {
						console.log('Server has ' + serverUnitCount + ' Units, Sync DB <- SERVER');
					} else {
						console.log('Server is Synced');
					}
				}

			} else {
				console.log('DB:' + units.length + ' Server:' + serverUnitCount);
			}
		})
		.catch(function (err) {
			console.log('erroring line59: ', err);
		})
	;
});
