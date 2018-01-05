const	_ = require('lodash');

const dbMapServiceController = require('./dbMapService');

_.set(exports, 'setEWRTask', function (serverName, unitName) {
	var sendClient = {
		action: 'ADDTASK',
		taskType: 'EWR',
		unitName: unitName
	};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line13: ', err);
		})
	;
});
