const	_ = require('lodash');

const zoneController = require('./zone');
const groupController = require('./group');

const dbSystemServiceController = require('./dbSystemService');
const dbMapServiceController = require('./dbMapService');

// game mission commands
_.set(exports, 'sendMesgToAll', function (serverName, mesg, time) {
	var curCMD = 'trigger.action.outText("'+mesg+'", '+time+')';
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});

_.set(exports, 'sendMesgToCoalition', function (coalition, serverName, mesg, time) {
	var curCMD = 'trigger.action.outTextForCoalition('+coalition+', "'+mesg+'", '+time+')';
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});


// GameGui commands
_.set(exports, 'kickPlayer', function (serverName, playerId, mesg) {
	var curCMD = 'net.kick('+playerId+', "'+mesg+'")';
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'GameGuiArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});

_.set(exports, 'forcePlayerSpectator', function (serverName, playerId, mesg) {
	var curCMD;
	var sendClient;
	var actionObj;
	curCMD = 'net.force_player_slot('+playerId+', 0, "")';
	sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	actionObj = {actionObj: sendClient, queName: 'GameGuiArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
	curCMD = 'net.send_chat("'+mesg+'", all)';
	sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	actionObj = {actionObj: sendClient, queName: 'GameGuiArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});
