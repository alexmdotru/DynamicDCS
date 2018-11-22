const _ = require('lodash');
const radioTowerController = require('../action/radioTower');

_.set(exports, 'processFiveMinuteActions', function (serverName, fullySynced) {
	if (fullySynced) { radioTowerController.checkBaseWarnings(serverName); }
});
