const _ = require('lodash');
const constants = require('../../constants');
const masterDBController = require('../../db/masterDB');
const DCSLuaCommands = require('../../player/DCSLuaCommands');
const groupController = require('../../spawn/group');
const webPushCommands = require('../../socketIO/webPush');
const userLivesController = require('../../action/userLives');
const proximityController = require('../../proxZone/proximity');

_.set(exports, 'processEventLand', function (serverName, sessionName, eventObj) {
	var place = '';
	var baseLand;

	// Occurs when an aircraft lands at an airbase, farp or ship
	if (_.get(eventObj, 'data.arg6')){
		baseLand = _.get(eventObj, 'data.arg6');
	} else if (_.get(eventObj, 'data.arg5')) {
		baseLand = _.get(eventObj, 'data.arg5');
	}

	masterDBController.unitActions('read', serverName, {unitId: _.get(eventObj, ['data', 'arg3']), isCrate: false})
		.then(function (iunit) {
			masterDBController.srvPlayerActions('read', serverName, {sessionName: sessionName})
				.then(function (playerArray) {
					var iPlayer;
					var iCurObj;
					var curIUnit = _.get(iunit, 0);
					var curUnitDict = _.find(constants.unitDictionary, {_id: curIUnit.type});
					var curLifePointVal = (curUnitDict) ? curUnitDict.lifeCost : 1;
					if (curIUnit) {
						//landed logistic planes/helis spawn new group for area
						var curUnitName = _.get(curIUnit, 'name');
						if (_.includes(curUnitName, 'LOGISTICS|')) {
							var bName = _.split(curUnitName, '|')[2];
							var curSide = _.get(curIUnit, 'coalition');
							masterDBController.baseActions('read', serverName, {_id: bName})
								.then(function (bases) {
									var curBase = _.get(bases, [0], {}); // does this work?
									console.log('LANDINGCARGO: ', curBase.side === curSide, baseLand === bName, baseLand, ' = ', bName, curIUnit.category);
									if (curBase.side === curSide) {
										if (curIUnit.category === 'AIRPLANE') {
											if (baseLand === bName) {
												groupController.replenishUnits( serverName, bName, curSide);
												groupController.healBase(serverName, bName);
											}
										} else {
											groupController.replenishUnits( serverName, bName, curSide);
											groupController.healBase(serverName, bName);
										}
									}
								})
								.catch(function (err) {
								console.log('err line1323: ', err);
								})
							;
						}
						iPlayer = _.find(playerArray, {name: _.get(curIUnit, 'playername')});
						// console.log('land: ', _.get(curIUnit, 'playername'), baseLand, iPlayer);
						if(iPlayer) {
							// console.log('land: ', _.get(curIUnit, 'playername'), baseLand, iPlayer);
							var curUnitSide = _.get(curIUnit, 'coalition');
							proximityController.getBasesInProximity(serverName, _.get(curIUnit, 'lonLatLoc'), 5, curUnitSide)
								.then(function (friendlyBases) {
									if (friendlyBases.length > 0) {
										var curBase = _.get(friendlyBases, [0], {});
										var curBaseSide = _.get(curBase, 'side');
										// console.log('cb: ', curBase, curBaseSide, curUnitSide);
										place = ' at ' + _.get(curBase, '_id');
										masterDBController.srvPlayerActions('applyTempToRealScore', serverName, {_id: iPlayer._id, groupId: curIUnit.groupId})
											.catch(function (err) {
												console.log('line70', err);
											})
										;
										iCurObj = {
											sessionName: sessionName,
											eventCode: constants.shortNames[eventObj.action],
											iucid: _.get(iPlayer, 'ucid'),
											iName: _.get(curIUnit, 'playername'),
											displaySide: _.get(curIUnit, 'coalition'),
											roleCode: 'I',
											msg: 'C: '+ _.get(curIUnit, 'type') + '(' + _.get(curIUnit, 'playername') + ') has landed at friendly ' + place
										};
										console.log('FriendBaseLand: ', _.get(iCurObj, 'msg'));
										if(_.get(iCurObj, 'iucid')) {
											userLivesController.addLifePoints(
												serverName,
												iPlayer,
												curIUnit,
												'Land'
											);
											webPushCommands.sendToCoalition(serverName, {payload: {action: eventObj.action, data: _.cloneDeep(iCurObj)}});
											masterDBController.simpleStatEventActions('save', serverName, iCurObj);
										}
									}
								})
								.catch(function (err) {
									console.log('err line100: ', err);
								})
							;
						}
					}
				})
				.catch(function (err) {
					console.log('err line108: ', err);
				})
			;
		})
		.catch(function (err) {
			console.log('err line113: ', err);
		})
	;
});
