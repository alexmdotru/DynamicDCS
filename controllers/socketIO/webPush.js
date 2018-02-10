const _ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');

_.set(exports, 'sendToAll', function (serverName, pData) {
	_.set(pData, 'serverName', _.toLower(serverName));
	for(var x=0; x <= '3'; x++) {
		_.set(pData, 'side', x);
		dbMapServiceController.webPushActions('save', serverName, pData)
			.catch(function (err) {
				console.log('line9: ', err);
			})
		;
	}
});

_.set(exports, 'sendToCoalition', function (serverName, pData) {
	_.set(pData, 'serverName', _.toLower(serverName));
	_.set(pData, 'side', _.get(pData, ['payload', 'data', 'displaySide']));
	dbMapServiceController.webPushActions('save', serverName, pData)
		.catch(function (err) {
			console.log('line274: ', err);
		})
	;

	_.set(pData, 'side', _.get(pData, ['payload', 'data', 3]));
	dbMapServiceController.webPushActions('save', serverName, pData)
		.catch(function (err) {
			console.log('line274: ', err);
		})
	;
});

_.set(exports, 'sendToIndividual', function (serverName, socketId, pData) {

});
