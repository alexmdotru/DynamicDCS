const	_ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const proximityController = require('../proxZone/proximity');
const groupController = require('../spawn/group');
const reloadController = require('../menu/reload');
const repairController = require('../menu/repair');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const menuCmdsController = require('../menu/menuCmds');

_.set(exports, 'processStaticCrate', function (serverName, crateObj) {
	var cPromise = [];
	_.forEach(_.get(crateObj, 'data', {}), function (crate, name) {
		if(crate.alive) {
			console.log('ACHK: ', name);
			cPromise.push(dbMapServiceController.staticCrateActions('update', serverName, {_id: name, lonLatLoc: [crate.lon, crate.lat]})
				.catch(function (err) {
					console.log('line 17: ', err);
				})
			);
		} else {
			console.log('DCHK: ', name);
			cPromise.push(dbMapServiceController.staticCrateActions('delete', serverName, {_id: name})
				.catch(function (err) {
					console.log('line 23: ', err);
				})
			);
		}
	});
	Promise.all(cPromise)
		.then(function () {
			if(crateObj.callback === 'unpackCrate') {
				exports.unpackCrate(serverName, crateObj);
			}
		})
		.catch(function (err) {
			console.log('erroring line35: ', err);
		})
	;
});

_.set(exports, 'unpackCrate', function (serverName, crateObj) {
	dbMapServiceController.unitActions('read', serverName, {unitId: crateObj.unitId})
		.then(function(pUnit) {
			var curPlayerUnit = _.get(pUnit, 0);
			proximityController.getStaticCratesInProximity(serverName, curPlayerUnit.lonLatLoc, 0.4, curPlayerUnit.coalition)
				.then(function(crates){
					var cCnt = 0;
					var grpTypes;
					var localCrateNum;
					var msg;
					var curCrate = _.get(crates, [0], {});
					var numCrate = curCrate.crateAmt;
					var curCrateSpecial = curCrate.special;
					var curCrateType = curCrate.templateName;
					var isCombo = curCrate.isCombo;
					var isMobile = curCrate.playerCanDrive;
					if(curCrate && curCrate.name) {
						//virtual sling loading
						grpTypes = _.transform(crates, function (result, value) {
							(result[curCrateType] || (result[curCrateType] = [])).push(value);
						}, {});

						localCrateNum = _.get(grpTypes, [curCrateType], []).length;
						if( localCrateNum >=  numCrate) {
							cCnt = 1;
							_.forEach(_.get(grpTypes, [curCrateType]), function (eCrate) {
								if ( cCnt <= numCrate) {
									dbMapServiceController.staticCrateActions('delete', serverName, {
										_id: eCrate._id
									})
										.catch(function (err) {
											console.log('erroring line59: ', err);
										})
									;
									groupController.destroyUnit(serverName, eCrate.name);
									cCnt ++;
								}
							});

							if (curCrateSpecial === 'reloadGroup') {
								reloadController.reloadSAM(serverName, curPlayerUnit, curCrate);
							} else if (curCrateSpecial === 'repairBase') {
								repairController.repairBase(serverName, curPlayerUnit, curCrateType, curCrate);
							} else {
								msg = "G: Unpacking " + _.toUpper(curCrateSpecial) + " " + curCrateType + "!";
								menuCmdsController.unpackCrate(serverName, curPlayerUnit, curCrateType, curCrateSpecial, isCombo, isMobile);
								groupController.destroyUnit(serverName, curCrate.name);
								DCSLuaCommands.sendMesgToGroup(
									curPlayerUnit.groupId,
									serverName,
									msg,
									5
								);
							}

						} else {
							DCSLuaCommands.sendMesgToGroup(
								curPlayerUnit.groupId,
								serverName,
								"G: Not Enough Crates for " + curCrateType + "!(" + localCrateNum + '/' + numCrate + ")",
								5
							);
						}
					} else {
						// no troops
						DCSLuaCommands.sendMesgToGroup(
							curPlayerUnit.groupId,
							serverName,
							"G: No Crates To Unpack!",
							5
						);
					}
				})
				.catch(function (err) {
					console.log('line 32: ', err);
				})
			;
		})
		.catch(function (err) {
			console.log('line 32: ', err);
		})
	;
});
