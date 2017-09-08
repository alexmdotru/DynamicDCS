const net = require('net'),
	_ = require('lodash');

const dbSystemServiceController = require('./dbSystemService');
const dbMapServiceController = require('./dbMapService');

_.set(exports, 'sendMesgToAll', function (serverName, mesg, time) {
	var curCMD = 'trigger.action.outText("'+mesg+'", '+time+')';
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	console.log('STA: ', serverName, actionObj);
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});

_.set(exports, 'sendMesgToCoalition', function (coalition, serverName, mesg, time) {
	var curCMD = 'trigger.action.outTextForCoalition('+coalition+', "'+mesg+'", '+time+')';
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	console.log('SMTC: ', serverName, actionObj);
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});
