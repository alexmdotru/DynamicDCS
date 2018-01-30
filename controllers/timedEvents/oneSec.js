const _ = require('lodash');
const proximityController = require('../proxZone/proximity');

_.set(exports, 'processOneSecActions', function (serverName, fullySynced) {
	if (fullySynced) {
		proximityController.checkUnitsToBaseForTroops(serverName);

		proximityController.checkUnitsToLogisticTowers(serverName);

		proximityController.checkUnitsToBaseForCapture(serverName);
	}
});

