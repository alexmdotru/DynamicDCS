const	_ = require('lodash');
const dbMapServiceController = require('./dbMapService');
const groupController = require('./group');
const menuUpdateController = require('./menuUpdate');

var unitsInProxMap = {};

_.set(exports, 'getPlayersInProximity', function (serverName, lonLat, kmDistance, inAir, typeArry) {
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
			type: {
				$in: typeArry
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

_.set(exports, 'checkUnitsToBase', function (serverName) {
	// check every base that is owned by red or blue, 20 km sphere
	dbMapServiceController.baseActions('read', serverName, {mainBase: true, $or: [{side: 1}, {side: 2}]})
		.then(function (bases) {
			_.forEach(bases, function (base) {
				exports.getUnitsInProximity(serverName, _.get(base, 'centerLoc'), 20);
			});
		})
		.catch(function (err) {
			console.log('line 35: ', err);
		})
	;
});

_.set(exports, 'checkUnitsToLogisticTowers', function (serverName) {
	// console.log('t: ', unitsInProxMap);
	dbMapServiceController.unitActions('read', serverName, {proxChkGrp: 'logisticTowers'})
		.then(function (logiUnits) {
			_.forEach(logiUnits, function (logiUnit) {
				var curLogiName = logiUnit.name;
				_.set(unitsInProxMap, curLogiName, _.get(unitsInProxMap, curLogiName, {}));
				exports.getPlayersInProximity(serverName, _.get(logiUnit, 'lonLatLoc'), 0.2, false, ['UH-1H', 'Mi-8MT', 'Ka-50'])
					.then(function (unitsInProx) {
						_.forEach(_.get(unitsInProxMap, curLogiName, {}), function (unit, key) {
							var cId = _.toNumber(key);
							var curUnit = _.get(unit, [cId]);
							if(!_.find(unitsInProx, {_id: cId}) && curUnit) {
								_.set(curUnit, 'enabled', false);
								console.log('REMOVE MENU: ', curUnit);
								//remove logi f10 menu
								console.log('cu: ', curUnit);
								menuUpdateController.logisticsMenu('removeTroopMenu', serverName, curUnit.groupId, cId, curUnit.coalition)
							}
						});
						_.forEach(unitsInProx, function(unit) {
							var cId = unit._id;
							if(cId && curLogiName) {
								if(!_.get(unitsInProxMap, [curLogiName, cId])) {
									_.set(unitsInProxMap, [curLogiName, cId], {
										enabled: true,
										data: unit
									});
									console.log('ADD MENU: ', curLogiName, cId);
									//update f10 radio menu
									menuUpdateController.logisticsMenu('addTroopMenu', serverName, unit.groupId, cId, unit.coalition)
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
