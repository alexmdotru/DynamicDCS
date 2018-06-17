const	_ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const proximityController = require('../proxZone/proximity');
const groupController = require('../spawn/group');

_.set(exports, 'checkTroopProx', function (serverName) {
	dbMapServiceController.unitActions('read', serverName, {"isTroop" : true, dead: false})
		.then(function (troopUnits) {
			_.forEach(troopUnits, function (troop) {
				var stParse = _.split(troop.name, '|');
				var playerName = stParse[3];
				proximityController.isPlayerInProximity(serverName, troop.lonLatLoc, 1, playerName)
					.then(function (isPlayerProximity) {
						console.log('Destroying ' + playerName + 's ' + troop.type + ' has been destroyed due to proximity', isPlayerProximity, !isPlayerProximity);
						if (!isPlayerProximity) {
							groupController.destroyUnit(serverName, troop.name);
						}
					})
					.catch(function (err) {
						console.log('erroring line162: ', err);
					})
				;
			});
		})
		.catch(function (err) {
			console.log('erroring line162: ', err);
		})
	;
});
