const	_ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');

// game mission commands
_.set(exports, 'sendMesgToAll', function (serverName, mesg, time) {
	var curCMD = 'trigger.action.outText([['+mesg+']], '+time+')';
	var sendClient = {action: "CMD", cmd: [curCMD], reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line16: ', err);
		})
	;
});

_.set(exports, 'sendMesgToCoalition', function (coalition, serverName, mesg, time) {
	var curCMD = 'trigger.action.outTextForCoalition('+coalition+', [['+mesg+']], '+time+')';
	var sendClient = {action: "CMD", cmd: [curCMD], reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line27: ', err);
		})
	;
});

_.set(exports, 'sendMesgToGroup', function (groupId, serverName, mesg, time) {
	var curCMD = 'trigger.action.outTextForGroup('+groupId+', [['+mesg+']], '+time+')';
	var sendClient = {action: "CMD", cmd: [curCMD], reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line38: ', err);
		})
	;
});


// GameGui commands
_.set(exports, 'kickPlayer', function (serverName, playerId, mesg) {
	var curCMD = 'net.kick('+playerId+', [['+mesg+']])';
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'gameGuiArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line51: ', err);
		})
	;
});

_.set(exports, 'forcePlayerSpectator', function (serverName, playerId, mesg) {
	var curCMD;
	var sendClient;
	var actionObj;
	curCMD = 'net.force_player_slot('+playerId+', 0, "")';
	sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	actionObj = {actionObj: sendClient, queName: 'gameGuiArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line65: ', err);
		})
	;
	curCMD = 'net.send_chat([['+mesg+']], all)';
	sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	actionObj = {actionObj: sendClient, queName: 'gameGuiArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line73: ', err);
		})
	;
});
