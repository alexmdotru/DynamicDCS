const _ = require('lodash');
const constants = require('../../constants');
const dbMapServiceController = require('../../dbMapService');
const DCSLuaCommands = require('../../DCSLuaCommands');
const playersEvent = require('../../events/backend/players');

_.set(exports, 'processDisconnect', function (serverName, sessionName, eventObj) {
	var iPlayer;
	var iCurObj;
	// "disconnect", playerID, name, playerSide, reason_code
	iPlayer = _.find(playersEvent.rtPlayerArray[serverName], {id: eventObj.data.arg1});
	if (iPlayer) {
		iCurObj = {
			sessionName: sessionName,
			eventCode: constants.shortNames[eventObj.action],
			iucid: iPlayer.ucid,
			iName: iPlayer.name,
			displaySide: 'A',
			roleCode: 'I',
			msg: 'A: ' + iPlayer.name + ' has disconnected - Ping:' + iPlayer.ping + ' Lang:' + iPlayer.lang
		};
		if(iCurObj.iucid) {
			// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
			dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
		}
		DCSLuaCommands.sendMesgToAll(
			serverName,
			_.get(iCurObj, 'msg'),
			5
		);
	}
});