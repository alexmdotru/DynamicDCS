const _ = require('lodash');
const constants = require('../../constants');
const masterDBController = require('../../db/masterDB');
const DCSLuaCommands = require('../../player/DCSLuaCommands');
const userLivesController = require('../../action/userLives');
const webPushCommands = require('../../socketIO/webPush');
const weaponComplianceController = require('../../action/weaponCompliance');
const proximityController = require('../../proxZone/proximity');

_.set(exports, 'processEventTakeoff', function (serverName, sessionName, eventObj) {
	var place;
	// Occurs when an aircraft takes off from an airbase, farp, or ship.
	if (_.get(eventObj, 'data.arg6')){
		place = ' from '+_.get(eventObj, 'data.arg6');
	} else if (_.get(eventObj, 'data.arg5')) {
		place = ' from '+_.get(eventObj, 'data.arg5');
	} else {
		place = '';
	}

	masterDBController.unitActions('read', serverName, {unitId: _.get(eventObj, ['data', 'arg3'])})
		.then(function (iunit) {
			masterDBController.srvPlayerActions('read', serverName, {sessionName: sessionName})
				.then(function (playerArray) {
					var iPlayer;
					var iCurObj;
					var curIUnit = _.get(iunit, 0);
					var curUnitDict = _.find(constants.unitDictionary, {_id: curIUnit.type});
					var curUnitSide = _.get(curIUnit, 'coalition');
					var curLifePointVal = (curUnitDict) ? curUnitDict.lifeCost : 1;
					if (curIUnit) {
						iPlayer = _.find(playerArray, {name: _.get(curIUnit, 'playername')});
						// console.log('takeoff: ', _.get(curIUnit, 'playername'));
						if (iPlayer.ucid) {
							if (weaponComplianceController.checkWeaponComplianceOnTakeoff(serverName, iPlayer, curIUnit)) {
								proximityController.getBasesInProximity(serverName, _.get(curIUnit, 'lonLatLoc'), 5, curUnitSide)
									.then(function(friendlyBases) {
										if(friendlyBases.length > 0) {
											iCurObj = {
												sessionName: sessionName,
												eventCode: constants.shortNames[eventObj.action],
												iucid: _.get(iPlayer, 'ucid'),
												iName: _.get(curIUnit, 'playername'),
												displaySide: _.get(curIUnit, 'coalition'),
												roleCode: 'I',
												msg: 'C: '+ _.get(curIUnit, 'type') + '('+_.get(curIUnit, 'playername')+') has taken off' + place
											};
											userLivesController.removeLifePoints(
												serverName,
												iPlayer,
												curIUnit,
												'Takeoff'
											);
											webPushCommands.sendToCoalition(serverName, {payload: {action: eventObj.action, data: _.cloneDeep(iCurObj)}});
											masterDBController.simpleStatEventActions('save', serverName, iCurObj);
										}
									})
									.catch(function (err) {
										console.log('err line45: ', err);
									})
								;
							}
						}
					}
				})
				.catch(function (err) {
					console.log('err line45: ', err);
				})
			;
		})
		.catch(function (err) {
			console.log('err line49: ', err);
		})
	;
});
