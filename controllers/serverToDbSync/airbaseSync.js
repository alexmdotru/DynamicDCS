const _ = require('lodash');
const dbMapServiceController = require('../dbMapService');

_.set(exports, 'processAirbaseUpdates', function (serverName, airbaseObj) {
	var curData = _.get(airbaseObj, 'data');
	if (_.get(queObj, 'action') === 'airbaseC') {
		var curServer = _.get(curServers, [serverName, 'details']);
		_.set(curData, 'maxUnitThreshold', _.random(_.get(curServer, 'minUnits'), _.get(curServer, 'maxUnits')));
		dbMapServiceController.baseActions('save', serverName, curData)
			.catch(function (err) {
				console.log('err line:11 ', err);
			})
		;
	}
});
