const	_ = require('lodash');
const masterDBController = require('../db/masterDB');

_.set(exports, 'setbaseSides', function (serverName) {
	masterDBController.baseActions('getBaseSides', serverName, {})
		.then(function (baseSides) {
			masterDBController.cmdQueActions('save', serverName, {
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
