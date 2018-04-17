const _ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const groupController = require('../spawn/group');
const baseSpawnFlagsController = require('../action/baseSpawnFlags');
const menuUpdateController = require('../menu/menuUpdate');

var replenThreshold = 30; // percentage under max
var replenTimer = _.random(1800, 5400);
var AIMaxIdleTime = (5 * 60 * 1000); // 5 mins
var maxCrateLife = (90 * 60 * 1000); // 90 mins

_.set(exports, 'processFiveSecActions', function (serverName, fullySynced) {
	if (fullySynced) {
		//set base flags
		baseSpawnFlagsController.setbaseSides(serverName);

		//cleanupAI AIMaxIdleTime
		dbMapServiceController.unitActions('read', serverName, {isAI: true, dead:false})
			.then(function (AICleanup) {
				_.forEach(AICleanup, function (AIUnit) {
					if (_.isEmpty(AIUnit.playername) && new Date(_.get(AIUnit, 'updatedAt', 0)).getTime() + AIMaxIdleTime < new Date().getTime()) {
						groupController.destroyUnit( serverName, AIUnit.name );
					}
				});
			})
			.catch(function (err) {
				console.log('err line20: ', err);
			})
		;

		//clean crates older than 90mins
		if (menuUpdateController.virtualCrates) {
			dbMapServiceController.unitActions('read', serverName, {isCrate: true, dead:false})
				.then(function (crateCleanup) {
					_.forEach(crateCleanup, function (crate) {
						if (new Date(_.get(crate, 'createdAt', 0)).getTime() + maxCrateLife < new Date().getTime()) {
							groupController.destroyUnit( serverName, crate.name );
						}
					});
				})
				.catch(function (err) {
					console.log('err line42: ', err);
				})
			;
		} else {
			dbMapServiceController.staticCrateActions('readStd', serverName, {})
				.then(function (crateCleanup) {
					_.forEach(crateCleanup, function (crate) {
						if (new Date(_.get(crate, 'createdAt', 0)).getTime() + maxCrateLife < new Date().getTime()) {
							dbMapServiceController.staticCrateActions('delete', serverName, {_id: crate._id})
								.then(function () {
									console.log('destroy crate: ', crate.name);
									groupController.destroyUnit( serverName, crate.name );
								})
								.catch(function (err) {
									console.log('line 56: ', err);
								})
							;
						}
					});
				})
				.catch(function (err) {
					console.log('err line63: ', err);
				})
			;
		}

		dbMapServiceController.baseActions('read', serverName, {mainBase: true, $or: [{side: 1}, {side: 2}]})
			.then(function (bases) {
				_.forEach(bases, function (base) {
					var curRegEx = '^' + _.get(base, '_id') + ' #';
					var unitCnt = _.get(base, 'maxUnitThreshold') * ((100 - replenThreshold) * 0.01);
					dbMapServiceController.unitActions('read', serverName, {name: new RegExp(curRegEx), dead: false})
						.then(function (units) {
							var replenEpoc = new Date(_.get(base, 'replenTime', 0)).getTime();
							if ((units.length < unitCnt) && replenEpoc < new Date().getTime()) { //UNCOMMENT OUT FALSE
								dbMapServiceController.baseActions('updateReplenTimer', serverName, {name: _.get(base, '_id'),  replenTime: new Date().getTime() + (replenTimer * 1000)})
									.then(function () {
										if (base.farp) {
											dbMapServiceController.baseActions('read', serverName, {_id: base.name + ' #' + base.side})
												.then(function (farpBase) {
													groupController.spawnSupportPlane(serverName, base, base.side, _.get(farpBase, [0], {}));
												})
												.catch(function (err) {
													console.log('line 54: ', err);
												})
											;
										} else {
											groupController.spawnSupportPlane(serverName, base, base.side);
										}
									})
									.catch(function (err) {
										console.log('line 62: ', err);
									})
								;
							}
						})
						.catch(function (err) {
							console.log('line 68: ', err);
						})
					;
				});
			})
			.catch(function (err) {
				console.log('line74', err);
			})
		;
	}
});
