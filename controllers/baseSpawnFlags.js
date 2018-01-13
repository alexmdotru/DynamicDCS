const	_ = require('lodash');
const dbMapServiceController = require('./dbMapService');

_.set(exports, 'setbaseSides', function (serverName) {
	dbMapServiceController.baseActions('getBaseSides', serverName, {})
		.then(function (baseSides) {
			dbMapServiceController.cmdQueActions('save', curServerName, {
				queName: 'clientArray',
				actionObj: {
					action: "SETBASEFLAGS",
					data: baseSides
				}
			});
		})
		.catch(function (err) {
			console.log('line1491', err);
		})
	;
});
