const _ = require('lodash');
const constants = require('../../constants');
const masterDBController = require('../../db/masterDB');
const DCSLuaCommands = require('../../player/DCSLuaCommands');
const webPushCommands = require('../../socketIO/webPush');

_.set(exports, 'processEventBirth', function (serverName, sessionName, eventObj) {
	// Occurs when any object is spawned into the mission.
	var curUnitId = _.get(eventObj, ['data', 'arg3']);
	if (curUnitId) {
		masterDBController.unitActions('read', serverName, {unitId: _.get(eventObj, ['data', 'arg3'])})
			.then(function (iunit) {
				var curIUnit = _.get(iunit, 0);
				if (_.get(curIUnit, 'playername', '') !== '') {
					masterDBController.srvPlayerActions('read', serverName, {sessionName: sessionName})
						.then(function (playerArray) {
							var iPlayer;
							var iCurObj;
							if (curIUnit) {
								iPlayer = _.find(playerArray, {name: _.get(curIUnit, 'playername')});
								if (iPlayer) {
									iCurObj = {
										sessionName: sessionName,
										eventCode: constants.shortNames[eventObj.action],
										iucid: _.get(iPlayer, 'ucid'),
										iName: _.get(curIUnit, 'playername'),
										displaySide: _.get(curIUnit, 'coalition'),
										roleCode: 'I',
										msg: 'C: '+ _.get(curIUnit, 'playername') +' enters a brand new ' + _.get(curIUnit, 'type'),
										groupId: _.get(curIUnit, 'groupId')
									};
									if (_.get(iCurObj, 'iucid')) {
										webPushCommands.sendToCoalition(serverName, {payload: {action: eventObj.action, data: _.cloneDeep(iCurObj)}});
										masterDBController.simpleStatEventActions('save', serverName, iCurObj);
									}
									masterDBController.srvPlayerActions('clearTempScore', serverName, {_id: _.get(iCurObj, 'iucid'), groupId: _.get(iCurObj, 'groupId')})
										.catch(function (err) {
											console.log('line35', err);
										})
									;
									/*
                                    DCSLuaCommands.sendMesgToCoalition(
                                        _.get(iCurObj, 'displaySide'),
                                        serverName,
                                        _.get(iCurObj, 'msg'),
                                        5
                                    );
                                    */
								}
							}
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
});
