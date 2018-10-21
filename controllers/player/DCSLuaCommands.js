const	_ = require('lodash');
const masterDBController = require('../db/masterDB');

// game mission commands
_.set(exports, 'sendMesgToAll', function (serverName, mesg, time) {
	var curCMD = 'trigger.action.outText([['+mesg+']], '+time+')';
	var sendClient = {action: "CMD", cmd: [curCMD], reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	masterDBController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line16: ', err);
		})
	;
});

_.set(exports, 'sendMesgToCoalition', function (coalition, serverName, mesg, time) {
	var curCMD = 'trigger.action.outTextForCoalition('+coalition+', [['+mesg+']], '+time+')';
	var sendClient = {action: "CMD", cmd: [curCMD], reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	masterDBController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line27: ', err);
		})
	;
});

_.set(exports, 'sendMesgToGroup', function (groupId, serverName, mesg, time) {
	var curCMD = 'trigger.action.outTextForGroup('+groupId+', [['+mesg+']], '+time+')';
	var sendClient = {action: "CMD", cmd: [curCMD], reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	masterDBController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line38: ', err);
		})
	;
});

_.set(exports, 'setIsOpenSlotFlag', function (serverName, lockFlag) {
	var sendClient = {action: "SETISOPENSLOT", val: lockFlag};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	masterDBController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line38: ', err);
		})
	;
});

// GameGui commands
_.set(exports, 'sendMesgChatWindow', function (serverName, mesg) {
	var curCMD = 'net.send_chat([['+mesg+']], true)';
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'gameGuiArray'};
	masterDBController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line45: ', err);
		})
	;
});

_.set(exports, 'kickPlayer', function (serverName, playerId, mesg) {
	var curCMD = 'net.kick('+playerId+', [['+mesg+']])';
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'gameGuiArray'};
	masterDBController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line56: ', err);
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
	masterDBController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line65: ', err);
		})
	;
	curCMD = 'net.send_chat([['+mesg+']], all)';
	sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	actionObj = {actionObj: sendClient, queName: 'gameGuiArray'};
	masterDBController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line73: ', err);
		})
	;
});

_.set(exports, 'loadMission', function (serverName, missionName) {
	var curCMD = 'net.load_mission([[' + missionName + ']])';
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'gameGuiArray'};
	masterDBController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line65: ', err);
		})
	;
});
