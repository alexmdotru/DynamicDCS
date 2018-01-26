const _ = require('lodash');
const constants = require('../../constants');
const dbMapServiceController = require('../../db/dbMapService');
const DCSLuaCommands = require('../../player/DCSLuaCommands');
const playersEvent = require('../../events/backend/players');

_.set(exports, 'processFriendlyFire', function (serverName, sessionName, eventObj) {
	var iCurObj;
	var iPlayer;
	var tPlayer;
	var mesg;
	// "friendly_fire", playerID, weaponName, victimPlayerID
	iCurObj = {
		sessionName: sessionName,
		eventCode: constants.shortNames[eventObj.action],
		displaySide: 'A',
		roleCode: 'I',
		showInChart: true
	};

	iPlayer = _.find(playersEvent.rtPlayerArray[serverName], {id: eventObj.arg1});
	if (iPlayer) {
		_.set(iCurObj, 'iucid', iPlayer.ucid);
		_.set(iCurObj, 'iName', iPlayer.name);
	}
	tPlayer = _.find(playersEvent.rtPlayerArray[serverName], {id: eventObj.arg3});
	if (tPlayer) {
		_.set(iCurObj, 'tucid', tPlayer.ucid);
		_.set(iCurObj, 'tName', tPlayer.name);
	}


	if(iCurObj.iucid || iCurObj.tucid) {
		// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
		/*
		dbMapServiceController.statSrvEventActions('save', serverName, iCurObj)
			.catch(function (err) {
				console.log('err line45: ', err);
			})
		;
		*/

		console.log('tplayer: ', tPlayer, eventObj);
		mesg = 'A: ' + constants.side[iPlayer.side] +' ' + iPlayer.name + ' has accidentally hit ' + _.get(tPlayer, 'name', 'friendly unit') + ' with a ' + _.get(eventObj, 'arg2', '?') + ' - 100pts';
		DCSLuaCommands.sendMesgToAll(
			serverName,
			mesg,
			15
		);
	}
});
