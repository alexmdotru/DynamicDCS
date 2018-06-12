const _ = require('lodash');
const proximityController = require('../proxZone/proximity');
const eventHitController = require('../events/frontend/S_EVENT_HIT');

_.set(exports, 'processOneSecActions', function (serverName, fullySynced) {
	if (fullySynced) {
		eventHitController.checkShootingUsers(serverName);

		// proximityController.checkUnitsToBaseForTroops(serverName);

		// proximityController.checkUnitsToLogisticTowers(serverName);

		proximityController.checkUnitsToBaseForCapture(serverName);
	}
});

