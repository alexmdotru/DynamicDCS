const _ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const jtacController = require('../action/jtac');
const troopLocalizerController = require('../action/troopLocalizer');

_.set(exports, 'processThirtySecActions', function (serverName, fullySynced) {
	if (fullySynced) {
		dbMapServiceController.unitActions('removeAllDead', serverName, {})
			.then(function (response) {
				// console.log('removeAllDead: ', response.result);
			})
			.catch(function (err) {
				console.log('err line12: ', err);
			})
		;

		jtacController.aliveJtac30SecCheck(serverName);
		troopLocalizerController.checkTroopProx(serverName);
	}
});
