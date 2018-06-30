const _ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const groupController = require('../spawn/group');
const baseSpawnFlagsController = require('../action/baseSpawnFlags');

var replenThreshold = 30; // percentage under max
var replenTimer = _.random(5400, 9000);

_.set(exports, 'processFiveSecActions', function (serverName, fullySynced) {
	if (fullySynced) {
		//set base flags
		baseSpawnFlagsController.setbaseSides(serverName);

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
				console.log('line51', err);
			})
		;
	}
});
