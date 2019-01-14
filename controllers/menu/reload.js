const	_ = require('lodash');
const constants = require('../constants');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const masterDBController = require('../db/masterDB');
const groupController = require('../spawn/group');
const proximityController = require('../proxZone/proximity');

_.assign(exports, {
	reloadSAM: function (serverName, unitCalling, crate) {
		// console.log('RS: ', serverName, unitCalling, crate);
		return new Promise(function(resolve, reject) {
			proximityController.getGroundUnitsInProximity(serverName, unitCalling.lonLatLoc, 0.2, false)
				.then(function(units){
					var closestUnit = _.first(_.filter(units, {coalition: unitCalling.coalition}));
					if (closestUnit) {
						masterDBController.unitActions('read', serverName, {groupName: closestUnit.groupName, isCrate: false, dead: false})
							.then(function(samUnits){
								// console.log('samu: ', samUnits, closestUnit.groupName);
								if (samUnits.length) {
									var curSamType = _.first(samUnits).type;
									var curUnitDict = _.find(constants.unitDictionary, {_id: curSamType});
									var curReloadArray = _.get(curUnitDict, 'reloadReqArray', []);
									// console.log('uD: ', curUnitDict);
									if(curReloadArray.length === _.intersection(curReloadArray, _.map(samUnits, 'type')).length) {
										groupController.spawnGroup(serverName, samUnits);
										resolve(true);
									} else {
										DCSLuaCommands.sendMesgToGroup(
											unitCalling.groupId,
											serverName,
											"G: " + curSamType + " Is Too Damaged To Be Reloaded!",
											5
										);
										resolve(false);
									}
								} else {
									DCSLuaCommands.sendMesgToGroup(
										unitCalling.groupId,
										serverName,
										"G: Group does not have all of the pieces to reload",
										5
									);
									resolve(false);
								}
							})
							.catch(function (err) {
								reject(err);
								console.log('line 26: ', err);
							})
						;
					} else {
						DCSLuaCommands.sendMesgToGroup(
							unitCalling.groupId,
							serverName,
							"G: There are no units close enough to reload",
							5
						);
						resolve(false);
					}
				})
				.catch(function (err) {
					reject(err);
					console.log('line 125: ', err);
				})
			;
		});
	}
});

// combo units Kub, Buk, Roland, SA-3, Hawk
//Kub Mins, [Kub 2P25 ln, Kub 1S91 str]
//Buk Mins, {{SA-11 Buk CC 9S470M1 or SA-11 Buk SR 9S18M1} and SA-11 Buk LN 9A310M1}
//Hawk Mins, {Hawk pcp, {Hawk sr or Hawk tr}, Hawk ln}
//SA-3 Mins, {{snr s-125 tr or p-19 s-125 sr}, 5p73 s-125 ln}
//Roland Mins, {Roland Radar}
