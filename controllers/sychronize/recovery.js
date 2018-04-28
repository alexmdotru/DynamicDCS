const _ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const groupController = require('../spawn/group');

_.set(exports, 'sendMissingUnits', function (serverName, serverUnitArray) {
	var upPromises = [];
	dbMapServiceController.unitActions('chkResync', serverName, {})
		.then(function () {
			_.forEach(serverUnitArray, function (unitName) {
				upPromises.push(
					dbMapServiceController.unitActions('update', serverName, {_id: unitName, isResync: true, dead:false})
				)
			});
			Promise.all(upPromises)
				.then(function () {
					dbMapServiceController.unitActions('read', serverName, {isResync: false, dead: false})
						.then(function (units) {
							//console.log('DB RECOVERY UNITS NOT SYNCED: ' + units);
							var unit = _.get(units, [0]);
							var curDead;
							console.log('DB RESYNC, SERVER -> DB');
							// dont remove units, only add
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
