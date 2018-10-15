const	_ = require('lodash');
const constants = require('../constants');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const dbSystemLocalController = require('../db/dbSystemLocal');
const dbMapServiceController = require('../db/dbMapService');
const groupController = require('../spawn/group');
const proximityController = require('../proxZone/proximity');

_.set(exports, 'reloadSAM', function (serverName, unitCalling, crate) {
	proximityController.getGroundUnitsInProximity(serverName, unitCalling.lonLatLoc, 0.2, false)
		.then(function(units){
			var closestUnit = _.first(_.filter(units, {coalition: unitCalling.coalition}));
			if (closestUnit) {
				dbMapServiceController.unitActions('read', serverName, {groupName: closestUnit.groupName, isCrate: false, dead: false})
					.then(function(samUnits){
						// console.log('samu: ', samUnits, closestUnit.groupName); closest unit can be the repair truck.... LOL FIX ME
						if (samUnits.length) {
							var curSamType = _.first(samUnits).type;
							constants.unitDictionaryActions('read', {_id: curSamType, threatLvl: { $gt: 0 }})
								.then(function (samUnitDict) {
									//unit is multi, count mins, sum them, if true,
									var curUnitDict = _.get(samUnitDict, [0]);
									var curReloadArray = curUnitDict.reloadReqArray;
									if(curReloadArray.length === _.intersection(curReloadArray, _.map(samUnits, 'type')).length) {
										/*
										_.forEach(samUnits, function (unit) {
											groupController.destroyUnit(serverName, unit.name);
										});
										*/
										//should spawn units with same names
										groupController.spawnGroup(serverName, samUnits);
									} else {
										DCSLuaCommands.sendMesgToGroup(
											unitCalling.groupId,
											serverName,
											"G: " + curSamType + " Is Too Damaged To Be Reloaded!",
											5
										);
									}
								})
								.catch(function (err) {
									console.log('line 112: ', err);
								})
							;
						}
					})
					.catch(function (err) {
						console.log('line 26: ', err);
					})
				;
			}
		})
		.catch(function (err) {
			console.log('line 125: ', err);
		})
	;
});

// combo units Kub, Buk, Roland, SA-3, Hawk
//Kub Mins, [Kub 2P25 ln, Kub 1S91 str]
//Buk Mins, {{SA-11 Buk CC 9S470M1 or SA-11 Buk SR 9S18M1} and SA-11 Buk LN 9A310M1}
//Hawk Mins, {Hawk pcp, {Hawk sr or Hawk tr}, Hawk ln}
//SA-3 Mins, {{snr s-125 tr or p-19 s-125 sr}, 5p73 s-125 ln}
//Roland Mins, {Roland Radar}
