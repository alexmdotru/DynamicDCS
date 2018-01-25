const _ = require('lodash');
const proximityController = require('../proxZone/proximity');

_.set(exports, 'processOneSecActions', function (servername, fullySynced) {
	//check Prox base units
	proximityController.checkUnitsToBaseForTroops(servername);

	//check logi prox
	proximityController.checkUnitsToLogisticTowers(servername);

	if (fullySynced) {
		proximityController.checkUnitsToBaseForCapture(servername);
	}
});

