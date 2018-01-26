const _ = require('lodash');
const constants = require('../../constants');
const dbMapServiceController = require('../../db/dbMapService');
const DCSLuaCommands = require('../../player/DCSLuaCommands');
const playersEvent = require('../../events/backend/players');

_.set(exports, 'processDisconnect', function (serverName, sessionName, eventObj) {
	var iPlayer;
	var iCurObj;
	// "disconnect", playerID, name, playerSide, reason_code
	iPlayer = _.find(playersEvent.rtPlayerArray[serverName], {id: eventObj.arg1});
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
			dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj)
				.catch(function (err) {
					console.log('err line45: ', err);
				})
			;
		}
		DCSLuaCommands.sendMesgToAll(
			serverName,
			_.get(iCurObj, 'msg'),
			5
		);
	}
});
