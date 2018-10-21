const	_ = require('lodash');
const masterDBController = require('../db/masterDB');

exports.ewrUnitsActivated = {};

_.set(exports, 'setEWRTask', function (serverName, unitName) {
	var sendClient = {
		action: 'ADDTASK',
		taskType: 'EWR',
		unitName: unitName
	};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	masterDBController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line13: ', err);
		})
	;
});
