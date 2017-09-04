const net = require('net'),
	_ = require('lodash');

const dbSystemServiceController = require('./dbSystemService');
const dbMapServiceController = require('./dbMapService');

_.set(exports, 'sendMesgToAll', function (serverName, mesg) {
	var curCMD = 'trigger.action.outText("'+mesg+'", 5)';
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});

_.set(exports, 'sendMesgToCoalition', function (coalition, serverName, mesg) {
	var curCMD = 'trigger.action.outTextForCoalition('+coalition+', "'+mesg+'", 5)';
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});
