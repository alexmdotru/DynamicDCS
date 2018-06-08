const _ = require('lodash');
const constants = require('../../constants');
const dbMapServiceController = require('../../db/dbMapService');
const DCSLuaCommands = require('../../player/DCSLuaCommands');
const playersEvent = require('../../events/backend/players');
const userLivesController = require('../../action/userLives');

_.set(exports, 'processFriendlyFire', function (serverName, sessionName, eventObj) {
	//var iCurObj;
	var iPlayer;
	var tPlayer;
	var curIUnit;
	var curTUnit;
	var mesg;
	// "friendly_fire", playerID, weaponName, victimPlayerID

	iPlayer = _.find(playersEvent.rtPlayerArray[serverName], {id: eventObj.data.arg1});
	tPlayer = _.find(playersEvent.rtPlayerArray[serverName], {id: eventObj.data.arg3});

	// slot



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

	if(iPlayer && tPlayer) {
		if(iPlayer.slot !== tPlayer.slot && iPlayer.ucid !== tPlayer.ucid) {
			dbMapServiceController.srvPlayerActions('read', serverName, {_id: iPlayer.ucid})
				.then(function (players) {
					dbMapServiceController.unitActions('read', serverName, {unitId: iPlayer.slot})
						.then(function (iunit) {
							dbMapServiceController.unitActions('read', serverName, {unitId: tPlayer.slot})
								.then(function (tunit) {
									var curPlayer = _.get(players, 0);
									curIUnit = _.get(iunit, 0);
									curTUnit = _.get(tunit, 0);
									// console.log('tplayer: ', tPlayer, eventObj);
									if (_.includes(userLivesController.capLivesEnabled, curIUnit.type)) {
										userLivesController.removeLife(serverName, iPlayer.ucid, curIUnit, 'Cap');
									}
									if (_.includes(userLivesController.casLivesEnabled, curIUnit.type)) {
										userLivesController.removeLife(serverName, iPlayer.ucid, curIUnit, 'Cas');
									}

									if (_.includes(userLivesController.capLivesEnabled, curTUnit.type) && curTUnit.inAir) {
										userLivesController.autoAddLife(serverName, tPlayer.ucid, 'Cap');
									}
									if (_.includes(userLivesController.casLivesEnabled, curTUnit.type) && curTUnit.inAir) {
										userLivesController.autoAddLife(serverName, tPlayer.ucid, 'Cas');
									}

									if(new Date(curPlayer.safeLifeActionTime).getTime() < new Date().getTime()) {
										mesg = 'A: ' + constants.side[iPlayer.side] +' ' + iPlayer.name + '(' + curIUnit.type + ':-1 Life) has hit friendly ' + tPlayer.name + '(' + curTUnit.type + ':+1 Life) with a ' + _.get(eventObj, 'data.arg2', '?');
										DCSLuaCommands.sendMesgToCoalition(
											iPlayer.side,
											serverName,
											mesg,
											15
										);
									}
								})
								.catch(function (err) {
									console.log('err line45: ', err);
								})
							;
						})
						.catch(function (err) {
							console.log('err line45: ', err);
						})
					;
				})
				.catch(function (err) {
					console.log('err line45: ', err);
				})
			;
		}
	}
});
