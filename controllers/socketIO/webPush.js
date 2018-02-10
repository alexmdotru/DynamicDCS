const _ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');

_.set(exports, 'sendToAll', function (serverName, payload) {
	for(x=0; x <= '3', x++;) {
		_.set(payload, 'side', x);
		dbMapServiceController.webPushActions('save', serverName, payload)
			.catch(function (err) {
				console.log('line274: ', err);
			})
		;
	}
});

_.set(exports, 'sendToCoalition', function (serverName, payload) {
	dbMapServiceController.webPushActions('save', serverName, payload)
		.catch(function (err) {
			console.log('line274: ', err);
		})
	;

	_.set(payload, 'side', 3);
	dbMapServiceController.webPushActions('save', serverName, payload)
		.catch(function (err) {
			console.log('line274: ', err);
		})
	;
});

_.set(exports, 'sendToIndividual', function (serverName, socketId, payload) {

});
