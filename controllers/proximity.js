const	_ = require('lodash');

const dbMapServiceController = require('./dbMapService');
const groupController = require('./group');

_.set(exports, 'getUnitsInProximity', function (serverName, lonLat, kmDistance, incldUnits) {
	if (!incldUnits) {
		incldUnits = 'NotThisUnit';
	}
	dbMapServiceController.unitActions(
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
			$or: [
				{
					playername: {
						$ne: ''
					}
				},
				{
					name: new RegExp(incldUnits)
				}
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

});
