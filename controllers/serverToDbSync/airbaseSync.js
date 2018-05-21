const _ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');

_.set(exports, 'processAirbaseUpdates', function (serverName, airbaseObj) {
	var curData = _.get(airbaseObj, 'data');
	if (_.get(airbaseObj, 'action') === 'airbaseC') {
		dbMapServiceController.baseActions('save', serverName, curData)
			.catch(function (err) {
				console.log('err line:11 ', err);
			})
		;
	}
});
