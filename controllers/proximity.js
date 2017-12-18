const	_ = require('lodash');
const dbMapServiceController = require('./dbMapService');
const groupController = require('./group');

var unitsInProxMap = {};

_.set(exports, 'getUnitsInProximity', function (serverName, lonLat, kmDistance, incldUnits) {
	if (!incldUnits) {
		incldUnits = 'NotThisUnit';
	}
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
			$or: [
				{
					name: new RegExp(incldUnits)
				},
				{type: 'UH-1H'},
				{type: 'Mi-8MT'},
				{type: 'Ka-50'}
			]
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

_.set(exports, 'checkUnitsToLogistics', function (serverName) {
	// console.log('t: ', unitsInProxMap);
	dbMapServiceController.unitActions('read', serverName, {proxChkGrp: 'logisticTowers'})
		.then(function (logiUnits) {
			_.forEach(logiUnits, function (logiUnit) {
				var curLogiName = logiUnit.name;
				_.set(unitsInProxMap, curLogiName, _.get(unitsInProxMap, curLogiName, {}));
				exports.getUnitsInProximity(serverName, _.get(logiUnit, 'lonLatLoc'), 0.2)
					.then(function (unitsInProx) {
						_.forEach(_.get(unitsInProxMap, curLogiName, {}), function (unit, key) {
							var cId = _.toNumber(key);
							if(!_.find(unitsInProx, {_id: cId}) && _.get(unitsInProxMap, [curLogiName, cId])) {
								_.set(unitsInProxMap, [curLogiName, cId], false);
								console.log('REMOVE MENU: ', curLogiName, cId);
								//remove logi f10 menu
							}
						});
						_.forEach(unitsInProx, function(unit) {
							var cId = unit._id;
							if(cId && curLogiName) {
								if(!_.get(unitsInProxMap, [curLogiName, cId])) {
									_.set(unitsInProxMap, [curLogiName, cId], true);
									console.log('ADD MENU: ', curLogiName, cId);
									//update f10 radio menu
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
