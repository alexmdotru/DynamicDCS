const _ = require('lodash');
const proximityController = require('../proxZone/proximity');

_.set(exports, 'processOneSecActions', function (serverName, fullySynced) {
	//check Prox base units
	proximityController.checkUnitsToBaseForTroops(serverName);

	//check logi prox
	proximityController.checkUnitsToLogisticTowers(serverName);

	if (fullySynced) {
		proximityController.checkUnitsToBaseForCapture(serverName);
	}
});

