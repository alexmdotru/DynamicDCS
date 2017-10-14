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
	var curCMD = 'net.force_player_slot('+playerId+', 0, "")';
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'GameGuiArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
	var curCMD = 'net.send_chat("'+mesg+'", all)';
	var actionObj = {actionObj: sendClient, queName: 'GameGuiArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});

_.set(exports, 'spawnGroupsInPolyzones', function (serverName, baseName, pArray) {
	var perBase = 20;
	_.forEach(pArray, function (points, baseName) {
		if (_.isArray(points)) {
			var unitArray = [];
			for(pIndx = 1; pIndx < (perBase + 1); pIndx++) {
				var randVec2 = zoneController.getRandomVec2(points);
				unitArray.push({
					x: randVec2.x,
					y: randVec2.y,
					name: baseName
				});
			}
			if (!_.isEmpty(unitArray)) {
				var curGrpArry = groupController.spawnGrndUnit(serverName, unitArray[0], [{}], unitArray);
				// var curCMD = 'coalition.addGroup(2, 3, ' + curGrpArry + ')';
				// mist.dynAdd(newGroup)
				var curCMD = 'mist.dynAdd(' + curGrpArry + ')';
				var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
				var actionObj = {actionObj: sendClient, queName: 'clientArray'};
				dbMapServiceController.cmdQueActions('save', serverName, actionObj);
			}
		}
	});
});
