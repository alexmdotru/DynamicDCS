const _ = require('lodash');
const constants = require('../../constants');
const dbMapServiceController = require('../../db/dbMapService');
const DCSLuaCommands = require('../../player/DCSLuaCommands');
const playersEvent = require('../../events/backend/players');

_.set(exports, 'processFriendlyFire', function (serverName, sessionName, eventObj) {
	//var iCurObj;
	var iPlayer;
	var tPlayer;
	var mesg;
	// "friendly_fire", playerID, weaponName, victimPlayerID

	iPlayer = _.find(playersEvent.rtPlayerArray[serverName], {id: eventObj.data.arg1});
	tPlayer = _.find(playersEvent.rtPlayerArray[serverName], {id: eventObj.data.arg3});
	/*
	iCurObj = {
		sessionName: sessionName,
		eventCode: constants.shortNames[eventObj.action],
		displaySide: 'A',
		roleCode: 'I',
		showInChart: true
	};


	if (iPlayer) {
		_.set(iCurObj, 'iucid', iPlayer.ucid);
		_.set(iCurObj, 'iName', iPlayer.name);
	}
	if (tPlayer) {
		_.set(iCurObj, 'tucid', tPlayer.ucid);
		_.set(iCurObj, 'tName', tPlayer.name);
	}
	*/

	if(iPlayer.ucid && tPlayer.ucid) {
		// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
		/*
		dbMapServiceController.statSrvEventActions('save', serverName, iCurObj)
			.catch(function (err) {
				console.log('err line45: ', err);
			})
		;
		*/

		// console.log('tplayer: ', tPlayer, eventObj);
		mesg = 'A: ' + constants.side[iPlayer.side] +' ' + iPlayer.name + ' has hit friendly ' + tPlayer.name + ' with a ' + _.get(eventObj, 'data.arg2', '?') + ', -1 life to ' + iPlayer.name;
		DCSLuaCommands.sendMesgToCoalition(
			iPlayer.side,
			serverName,
			mesg,
			15
		);
	}
});
