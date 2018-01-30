const _ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const groupController = require('../spawn/group');
const DCSLuaCommands = require('../player/DCSLuaCommands');

_.set(exports, 'sendMissingUnits', function (serverName, serverUnitArray) {
	var upPromises = [];
	dbMapServiceController.unitActions('chkResync', serverName, {})
		.then(function () {
			_.forEach(serverUnitArray, function (unitId) {
				upPromises.push(dbMapServiceController.unitActions('update', serverName, {_id: unitId, isResync: true, dead:false}));
			});
			Promise.all(upPromises)
				.then(function () {
					dbMapServiceController.unitActions('read', serverName, {isResync: false, dead: false})
						.then(function (units) {
							var filterStructure = _.filter(units, {category: 'STRUCTURE'});
							var filterGround = _.filter(units, {category: 'GROUND'});
							//var masterUnitCount = filterStructure.length + filterGround.length;
							console.log('DB resync has ' + units.length + ' Units, Respawn Them');
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
						})
						.catch(function (err) {
							console.log('erroring line35: ', err);
						})
					;
				})
				.catch(function (err) {
					console.log('err line40: ', err);
				})
			;
		})
		.catch(function (err) {
			console.log('err line45: ', err);
		})
	;

});
