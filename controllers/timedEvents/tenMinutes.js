const _ = require('lodash');
const userLivesController = require('../action/userLives');

_.set(exports, 'processTenMinuteActions', function (serverName, fullySynced) {
	if (fullySynced) { userLivesController.updateServerLifePoints(serverName) }
});
