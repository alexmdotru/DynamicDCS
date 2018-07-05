const _ = require('lodash');
const constants = require('../../constants');
const dbMapServiceController = require('../../db/dbMapService');
const DCSLuaCommands = require('../../player/DCSLuaCommands');
const groupController = require('../../spawn/group');
const webPushCommands = require('../../socketIO/webPush');
const weaponComplianceController = require('../../action/weaponCompliance');

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

	dbMapServiceController.unitActions('read', serverName, {unitId: _.get(eventObj, ['data', 'arg3'])})
		.then(function (iunit) {
			dbMapServiceController.srvPlayerActions('read', serverName, {sessionName: sessionName})
				.then(function (playerArray) {
					var iPlayer;
					var iCurObj;
					var curIUnit = _.get(iunit, 0);
					var curUnitDict = _.find(groupController.unitDictionary, {_id: curIUnit.type});
					var curLifePointVal = (curUnitDict) ? curUnitDict.lifeCost : 1;
					if (curIUnit) {
						iPlayer = _.find(playerArray, {name: _.get(curIUnit, 'playername')});
						// console.log('takeoff: ', _.get(curIUnit, 'playername'));
						if (iPlayer.iucid) {
							if (weaponComplianceController.checkWeaponComplianceOnTakeoff(serverName, iPlayer, curIUnit)) {
								iCurObj = {
									sessionName: sessionName,
									eventCode: constants.shortNames[eventObj.action],
									iucid: _.get(iPlayer, 'ucid'),
									iName: _.get(curIUnit, 'playername'),
									displaySide: _.get(curIUnit, 'coalition'),
									roleCode: 'I',
									msg: 'C: '+ _.get(curIUnit, 'type') + '('+_.get(curIUnit, 'playername')+') has taken off' + place
								};
								dbMapServiceController.srvPlayerActions('removeLifePoints', serverName, {
									_id: iPlayer._id,
									execAction: curIUnit.type + ' Takeoff',
									groupId: curIUnit.groupId,
									removeLifePoints: curLifePointVal
								});
								webPushCommands.sendToCoalition(serverName, {payload: {action: eventObj.action, data: _.cloneDeep(iCurObj)}});
								dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
								/*
                                DCSLuaCommands.sendMesgToGroup(
                                    _.get(curIUnit, 'groupId'),
                                    serverName,
                                    _.get(iCurObj, 'msg'),
                                    5
                                );
                                */
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
