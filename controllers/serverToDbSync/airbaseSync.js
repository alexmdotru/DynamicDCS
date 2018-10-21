const _ = require('lodash');
const masterDBController = require('../db/masterDB');

_.set(exports, 'processAirbaseUpdates', function (serverName, airbaseObj) {
	var curData = _.get(airbaseObj, 'data');
	if (_.get(airbaseObj, 'action') === 'airbaseC') {
		masterDBController.baseActions('save', serverName, curData)
			.catch(function (err) {
				console.log('err line:11 ', err);
			})
		;
	}
});
