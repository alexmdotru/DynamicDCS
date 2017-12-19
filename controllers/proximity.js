const	_ = require('lodash');
const dbMapServiceController = require('./dbMapService');
const groupController = require('./group');
const menuUpdateController = require('./menuUpdate');

var unitsInProxLogiTowers = {};
var unitsInProxBases = {};

_.set(exports, 'getPlayersInProximity', function (serverName, lonLat, kmDistance, inAir) {
	return dbMapServiceController.unitActions(
		'read',
		serverName,
		{
			dead: false,
			lonLatLoc: {
				$geoWithin: {
					$centerSphere: [
						lonLat,
						kmDistance / 6378.1
					]
				}
			},
			playername: {
				$ne: ''
			},
			category: {
				$in: ['AIRPLANE', 'HELICOPTER']
			},
			inAir: inAir
		})
		.then(function (closeUnits) {
			// console.log('close units ' + closeUnits);
			return closeUnits;
		})
		.catch(function (err) {
			console.log('line 12: ', err);
		})
	;
});

_.set(exports, 'checkUnitsToBaseForTroops', function (serverName) {
	// check every base that is owned by red or blue, 20 km sphere
	dbMapServiceController.baseActions('read', serverName, {mainBase: true, $or: [{side: 1}, {side: 2}]})
		.then(function (bases) {
			_.forEach(bases, function (base) {
				var curBaseName = base.name;
				_.set(unitsInProxBases, curBaseName, _.get(unitsInProxBases, curBaseName, {}));
				exports.getPlayersInProximity(serverName, _.get(base, 'centerLoc'), 4, false)
					.then(function (unitsInProx) {
						_.forEach(_.get(unitsInProxBases, curBaseName, {}), function (unit, key) {
							var cId = _.toNumber(key);
							if(!_.find(unitsInProx, {_id: cId}) && unit.enabled) {
								_.set(unit, 'enabled', false);
								console.log('R baseTroops: ', curBaseName, cId);
								//remove logi f10 menu
								menuUpdateController.logisticsMenu('resetMenu', serverName, unit.data)
							}
						});
						_.forEach(unitsInProx, function(unit) {
							var cId = unit._id;
							if(cId && curBaseName) {
								if(!_.get(unitsInProxBases, [curBaseName, cId, 'enabled'])) {
									_.set(unitsInProxBases, [curBaseName, cId], {
										enabled: true,
										data: unit
									});
									console.log('A baseTroops: ', curBaseName, cId);
									//update f10 radio menu
									menuUpdateController.logisticsMenu('addTroopsMenu', serverName, unit);
								}
							}
						});
					})
					.catch(function (err) {
						console.log('line 64: ', err);
					})
				;
			});
		})
		.catch(function (err) {
			console.log('line 35: ', err);
		})
	;
});

_.set(exports, 'checkUnitsToLogisticTowers', function (serverName) {
	dbMapServiceController.unitActions('read', serverName, {proxChkGrp: 'logisticTowers'})
		.then(function (logiUnits) {
			_.forEach(logiUnits, function (logiUnit) {
				var curLogiName = logiUnit.name;
				_.set(unitsInProxLogiTowers, curLogiName, _.get(unitsInProxLogiTowers, curLogiName, {}));
				exports.getPlayersInProximity(serverName, _.get(logiUnit, 'lonLatLoc'), 0.2, false)
					.then(function (unitsInProx) {
						_.forEach(_.get(unitsInProxLogiTowers, curLogiName, {}), function (unit, key) {
							var cId = _.toNumber(key);
							if(!_.find(unitsInProx, {_id: cId}) && unit.enabled) {
								_.set(unit, 'enabled', false);
								console.log('R logiTower: ', curLogiName, cId);
								//remove logi f10 menu
								menuUpdateController.logisticsMenu('resetMenu', serverName, unit.data)
							}
						});
						_.forEach(unitsInProx, function(unit) {
							var cId = unit._id;
							if(cId && curLogiName) {
								if(!_.get(unitsInProxLogiTowers, [curLogiName, cId, 'enabled'])) {
									_.set(unitsInProxLogiTowers, [curLogiName, cId], {
										enabled: true,
										data: unit
									});
									console.log('A logiTower: ', curLogiName, cId);
									//update f10 radio menu
									menuUpdateController.logisticsMenu('addLogiCratesMenu', serverName, unit);
								}
							}
						});
					})
					.catch(function (err) {
						console.log('line 64: ', err);
					})
				;
			});
		})
		.catch(function (err) {
			console.log('line 64: ', err);
		})
	;
});
