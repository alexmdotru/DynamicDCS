const _ = require('lodash');
const constants = require('../../constants');
const masterDBController = require('../../db/masterDB');
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
			masterDBController.srvPlayerActions('read', serverName, {_id: iPlayer.ucid})
				.then(function (players) {
					var curPlayer = _.get(players, 0);
					// console.log('SAT: ', curPlayer.safeLifeActionTime);
					if(new Date(curPlayer.safeLifeActionTime).getTime() < new Date().getTime()) {
						masterDBController.unitActions('read', serverName, {unitId: iPlayer.slot})
							.then(function (iunit) {
								masterDBController.unitActions('read', serverName, {unitId: tPlayer.slot})
									.then(function (tunit) {
										curIUnit = _.first(iunit);
										curTUnit = _.first(tunit);
										// console.log('player: ', iPlayer, tPlayer);
										userLivesController.removeLifePoints(
											serverName,
											iPlayer,
											curIUnit,
											'Friendly Kill',
											true,
											6
										);

										if (curTUnit.inAir) {
											userLivesController.removeLifePoints(
												serverName,
												tPlayer,
												curTUnit,
												'Friendly Death',
												false
											);
										}

										mesg = 'A: ' + constants.side[iPlayer.side] +' ' + iPlayer.name + '(' + curIUnit.type + ':-6 LP) has hit friendly ' + tPlayer.name + '(' + curTUnit.type + ':+LPLoss) with a ' + _.get(eventObj, 'data.arg2', '?');
										DCSLuaCommands.sendMesgToCoalition(
											iPlayer.side,
											serverName,
											mesg,
											15
										);
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
				})
				.catch(function (err) {
					console.log('err line45: ', err);
				})
			;
		}
	}
});
