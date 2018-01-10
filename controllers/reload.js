const	_ = require('lodash');
const DCSLuaCommands = require('./DCSLuaCommands');
const dbSystemServiceController = require('./dbSystemService');
const dbMapServiceController = require('./dbMapService');
const groupController = require('./group');
const proximityController = require('./proximity');

_.set(exports, 'reloadSAM', function (serverName, unitCalling) {
	proximityController.getGroundUnitsInProximity(serverName, unitCalling.lonLatLoc, 0.4)
		.then(function(units){
			var closestUnit = _.first(_.filter(units, {coalition: unitCalling.coalition}));
			if (closestUnit) {
				dbMapServiceController.unitActions('read', serverName, {groupName: closestUnit.groupName, isCrate: false, dead: false})
					.then(function(samUnits){
						// console.log('samu: ', samUnits);
						if (samUnits.length > 1) {
							var curSamType = _.first(samUnits).type;
							dbSystemServiceController.unitDictionaryActions('read', {_id: curSamType})
								.then(function (samUnitDict) {
									//unit is multi, count mins, sum them, if true,
									var curUnitDict = _.get(samUnitDict, [0]);
									var curReloadArray = curUnitDict.reloadReqArray;
									// console.log('is unit fully alive: ', curReloadArray.length, ' === ', _.intersection(curReloadArray, _.map(samUnits, 'type')).length);
									if(curReloadArray.length === _.intersection(curReloadArray, _.map(samUnits, 'type')).length) {
										_.forEach(samUnits, function (unit) {
											groupController.destroyUnit(serverName, unit.name);
										});
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
						} else if (samUnits.length === 1) {
							//unit is single, respawn it
							var curUnit = _.get(samUnits, [0]);
							groupController.destroyUnit(serverName, curUnit.name);
							groupController.spawnGroup(serverName, [curUnit]);
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
