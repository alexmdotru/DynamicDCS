const _ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const groupController = require('../spawn/group');

var replenThreshold = 20; // percentage under max
var replenTimer = 3600; // 1 hour
var AIMaxIdleTime = (5 * 60 * 1000); // 5 mins
var maxCrateLife = (90 * 60 * 1000); // 90 mins

_.set(exports, 'processFiveSecActions', function (servername, fullySynced) {
	if (fullySynced) {
		//cleanupAI AIMaxIdleTime
		dbMapServiceController.unitActions('read', servername, {isAI: true, dead:false})
			.then(function (AICleanup) {
				_.forEach(AICleanup, function (AIUnit) {
					if (_.isEmpty(AIUnit.playername) && new Date(_.get(AIUnit, 'updatedAt', 0)).getTime() + AIMaxIdleTime < new Date().getTime()) {
						groupController.destroyUnit( servername, AIUnit.name );
					}
				});
			})
			.catch(function (err) {
				console.log('err line20: ', err);
			})
		;

		//clean crates older than 90mins
		dbMapServiceController.unitActions('read', servername, {isCrate: true, dead:false})
			.then(function (crateCleanup) {
				_.forEach(crateCleanup, function (crate) {
					if (new Date(_.get(crate, 'createdAt', 0)).getTime() + maxCrateLife < new Date().getTime()) {
						groupController.destroyUnit( servername, crate.name );
					}
				});
			})
			.catch(function (err) {
				console.log('err line34: ', err);
			})
		;
		dbMapServiceController.baseActions('read', servername, {mainBase: true, $or: [{side: 1}, {side: 2}]})
			.then(function (bases) {
				_.forEach(bases, function (base) {
					var curRegEx = '^' + _.get(base, '_id') + ' #';
					var unitCnt = _.get(base, 'maxUnitThreshold') * ((100 - replenThreshold) * 0.01);
					dbMapServiceController.unitActions('read', servername, {name: new RegExp(curRegEx), dead: false})
						.then(function (units) {
							var replenEpoc = new Date(_.get(base, 'replenTime', 0)).getTime();
							if ((units.length < unitCnt) && replenEpoc < new Date().getTime()) { //UNCOMMENT OUT FALSE
								dbMapServiceController.baseActions('updateReplenTimer', servername, {name: _.get(base, '_id'),  replenTime: new Date().getTime() + (replenTimer * 1000)})
									.then(function () {
										if (base.farp) {
											dbMapServiceController.baseActions('read', servername, {_id: base.name + ' #' + base.side})
												.then(function (farpBase) {
													groupController.spawnSupportPlane(servername, base, base.side, _.get(farpBase, [0], {}));
												})
												.catch(function (err) {
													console.log('line 54: ', err);
												})
											;
										} else {
											groupController.spawnSupportPlane(servername, base, base.side);
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
