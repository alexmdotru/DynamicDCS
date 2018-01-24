const _ = require('lodash');
const constants = require('../../constants');
const dbMapServiceController = require('../../dbMapService');
const DCSLuaCommands = require('../../DCSLuaCommands');
const playersEvent = require('../../events/backend/players');

_.set(exports, 'processSelfKill', function (serverName, sessionName, eventObj) {
	var iCurObj;
	var iPlayer;
	// "self_kill", playerID
	iCurObj = {sessionName: sessionName, name: eventObj.data.name};
	_.set(iCurObj, 'iPlayerId', _.get(eventObj, 'data.arg1'));
	iPlayer = _.find(playersEvent.rtPlayerArray[serverName], {id: queObj.data.arg1});
	if (iPlayer) {
		iCurObj = {
			sessionName: sessionName,
			eventCode: constants.shortNames[eventObj.action],
			iucid: iPlayer.ucid,
			iName: iPlayer.name,
			displaySide: 'A',
			roleCode: 'I',
			msg: 'A: ' + constants.side[iPlayer.side] + ' ' + iPlayer.name + ' has killed himself'
		};
		if(_.get(iCurObj, 'iucid')) {
			// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
			dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
		}

		DCSLuaCommands.sendMesgToAll(
			serverName,
			_.get(iCurObj, 'msg'),
			15
		);
	}
});
