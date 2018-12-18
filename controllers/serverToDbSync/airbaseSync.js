const _ = require('lodash');
const masterDBController = require('../db/masterDB');

_.set(exports, 'processAirbaseUpdates', function (serverName, mapType, airbaseObj) {
	var curData = _.get(airbaseObj, 'data');
	_.set(curData, 'mapType', mapType);
	if (_.get(airbaseObj, 'action') === 'airbaseC') {
		masterDBController.baseActions('save', serverName, curData)
			.catch(function (err) {
				console.log('err line:11 ', err);
			})
		;
	}
});
