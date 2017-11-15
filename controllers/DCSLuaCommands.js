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

_.set(exports, 'sendBaseCoalition', function (serverName) {
	var curCMD;
	var sendClient;
	var actionObj;

	dbMapServiceController.baseActions('read', serverName, {mainBase: true})
		.then(function (bases) {
			var mainB = 'dynDCS.baseArray = {';
			_.forEach(bases, function (base) {
				mainB += '["' + _.get(base,'_id') + '"] = ' + _.get(base,'side') + ',';
			});
			mainB += '}';
			var  setBaseArray = 'function loadBases() ' + mainB + 'end';
			/*
			var baseArray = _.transform(bases, function(result, value) {
				_.set(result, _.get(value,'_id'), _.get(value,'side'));
			}, {});
			//console.log('basearry: ', jsonBaseArray, baseArray);
			//curCMD = 'dynDCS.setBaseArray("' + jsonBaseArray + '")';
			*/
			curCMD = 'table.insert(baseArray, 1)';
			sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
			actionObj = {actionObj: sendClient, queName: 'GameGuiArray'};
			dbMapServiceController.cmdQueActions('save', serverName, actionObj);
		})
		.catch(function (err) {
			console.log('error line:57 ', err);
		})
	;
});
