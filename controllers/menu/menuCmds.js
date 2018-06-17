const	_ = require('lodash');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const dbMapServiceController = require('../db/dbMapService');
const proximityController = require('../proxZone/proximity');
const menuUpdateController = require('../menu/menuUpdate');
const groupController = require('../spawn/group');
const crateController = require('../spawn/crate');
const reloadController = require('../menu/reload');
const repairController = require('../menu/repair');
const userLivesController = require('../action/userLives');
const resourcePointsController = require('../action/resourcePoints');

exports.maxCrates = 10;
exports.maxTroops = 1;
exports.maxUnitsMoving = 7;
exports.maxUnitsStationary = 7;
exports.spawnLauncherCnt = 3;

_.set(exports, 'menuCmdProcess', function (serverName, sessionName, pObj) {
	var defCrate = 'iso_container_small';
	//var defCrate = (_.toNumber(pObj.mass) > 1000)?'iso_container':'iso_container_small';
	// console.log('process menu cmd: ', pObj);
	dbMapServiceController.unitActions('read', serverName, {unitId: pObj.unitId})
		.then(function(units) {
			var curUnit = _.get(units, 0);
			if (curUnit) {
				dbMapServiceController.srvPlayerActions('read', serverName, {name: curUnit.playername})
					.then(function(player) {
						var curPlayer = _.get(player, [0]);
						if (curPlayer) {
							var spawnArray;
							var curSpawnUnit;
							// action menu
							if (pObj.cmd === 'checkCapLives') {
								userLivesController.checkCapLives(serverName, curPlayer.ucid);
							}
							if (pObj.cmd === 'checkCasLives') {
								userLivesController.checkCasLives(serverName, curPlayer.ucid);
							} // resourcePoints
							if (pObj.cmd === 'resourcePoints') {
								resourcePointsController.checkResourcePoints(serverName, curPlayer);
							}
							if (pObj.cmd === 'unloadExtractTroops') {
								if(curUnit.inAir) {
									DCSLuaCommands.sendMesgToGroup(
										curUnit.groupId,
										serverName,
										"G: Please Land Before Attempting Logistic Commands!",
										5
									);
								} else {
									if(exports.isTroopOnboard(curUnit, serverName)) {
										var checkAllBase = [];
										dbMapServiceController.baseActions('read', serverName, {mainBase: true, $or: [{side: 1}, {side: 2}]})
											.then(function (bases) {
												_.forEach(bases, function (base) {
													checkAllBase.push(proximityController.isPlayerInProximity(serverName, base.centerLoc, 3.4, curUnit.playername)
														.catch(function (err) {
															console.log('line 59: ', err);
														})
													)
												});

												Promise.all(checkAllBase)
													.then(function (playerProx) {
														// console.log('player prox: ', playerProx, _.some(playerProx)); _.some(playerProx)

														if(_.some(playerProx)) {
															dbMapServiceController.unitActions('updateByUnitId', serverName, {unitId: pObj.unitId, troopType: null})
																.then(function(){
																	DCSLuaCommands.sendMesgToGroup(
																		curUnit.groupId,
																		serverName,
																		"G: " + curUnit.troopType + " has been dropped off at the base!",
																		5
																	);
																})
																.catch(function (err) {
																	console.log('line 26: ', err);
																})
															;
														} else {
															dbMapServiceController.unitActions('read', serverName, {playerOwnerId: curPlayer.ucid, isTroop: true, dead: false})
																.then(function(delUnits){
																	_.forEach(delUnits, function (unit) {
																		dbMapServiceController.unitActions('updateByUnitId', serverName, {unitId: unit.unitId, dead: true});
																		groupController.destroyUnit(serverName, unit.name);
																	});
																	// spawn troop type
																	curSpawnUnit = _.cloneDeep(_.first(groupController.getRndFromSpawnCat(curUnit.troopType, curUnit.coalition, false, true)));
																	spawnArray = {
																		spwnName: 'TU|' + curPlayer.ucid + '|' + curUnit.troopType + '|' + curUnit.playername + '|' ,
																		type: curSpawnUnit.type,
																		lonLatLoc: curUnit.lonLatLoc,
																		heading: curUnit.hdg,
																		country: curUnit.country,
																		category: curSpawnUnit.category,
																		playerCanDrive: false
																	};
																	groupController.spawnLogiGroup(serverName, [spawnArray], curUnit.coalition);
																	dbMapServiceController.unitActions('updateByUnitId', serverName, {unitId: pObj.unitId, troopType: null})
																		.catch(function (err) {
																			console.log('erroring line73: ', err);
																		})
																	;
																	DCSLuaCommands.sendMesgToGroup(
																		curUnit.groupId,
																		serverName,
																		"G: " + curSpawnUnit.type + " has been deployed!",
																		5
																	);
																})
																.catch(function (err) {
																	console.log('line 26: ', err);
																})
															;
														}
													})
													.catch(function (err) {
														console.log('line 26: ', err);
													})
												;
											})
											.catch(function (err) {
												console.log('line 26: ', err);
											})
										;
									} else {
										//try to extract a troop
										proximityController.getTroopsInProximity(serverName, curUnit.lonLatLoc, 0.2, curUnit.coalition)
											.then(function(units){
												var curTroop = _.get(units, [0]);
												if(curTroop) {
													// pickup troop
													dbMapServiceController.unitActions('updateByUnitId', serverName, {unitId: pObj.unitId, troopType: curTroop.spawnCat})
														.catch(function (err) {
															console.log('erroring line57: ', err);
														})
													;
													groupController.destroyUnit(serverName, curTroop.name);
													DCSLuaCommands.sendMesgToGroup(
														curUnit.groupId,
														serverName,
														"G: Picked Up " + curTroop.type + "!",
														5
													);
												} else {
													// no troops
													DCSLuaCommands.sendMesgToGroup(
														curUnit.groupId,
														serverName,
														"G: No Troops To Extract Or Unload!",
														5
													);
												}
											})
											.catch(function (err) {
												console.log('line114: ', err);
											})
										;
									}
								}
							}
						}
						if (pObj.cmd === 'isTroopOnboard') {
							exports.isTroopOnboard(curUnit, serverName, true);
						}
						if (pObj.cmd === 'isCrateOnboard') {
							exports.isCrateOnboard(curUnit, serverName, true);
						}
						if (pObj.cmd === 'unpackCrate') {
							proximityController.getLogiTowersProximity(serverName, curUnit.lonLatLoc, 0.8)
								.then(function (logiProx) {
									if (logiProx.length) {
										DCSLuaCommands.sendMesgToGroup(
											curUnit.groupId,
											serverName,
											"G: You need to move farther away from Command Towers (800m)",
											5
										);
									} else {
										if(curUnit.inAir) {
											DCSLuaCommands.sendMesgToGroup(
												curUnit.groupId,
												serverName,
												"G: Please Land Before Attempting Logistic Commands!",
												5
											);
										} else {
											if(menuUpdateController.virtualCrates) {
												proximityController.getVirtualCratesInProximity(serverName, curUnit.lonLatLoc, 0.4, curUnit.coalition)
													.then(function(units){
														var cCnt = 0;
														var grpTypes;
														var localCrateNum;
														var msg;
														var curCrate = _.get(units, [0], {});
														var numCrate = _.split(curCrate.name, '|')[4];
														var curCrateSpecial = _.split(curCrate.name, '|')[3];
														var curCrateType = _.split(curCrate.name, '|')[2];
														var isCombo = (_.split(curCrate.name, '|')[5] === 'true');
														var isMobile = (_.split(curCrate.name, '|')[6] === 'true');
														if(curCrate && curCrate.name) {
															//virtual sling loading
															grpTypes = _.transform(units, function (result, value) {
																(result[_.get(_.split(value.name, '|'), [2])] || (result[_.get(_.split(value.name, '|'), [2])] = [])).push(value);
															}, {});

															localCrateNum = _.get(grpTypes, [curCrateType], []).length;
															if( localCrateNum >=  numCrate) {
																cCnt = 1;
																_.forEach(_.get(grpTypes, [curCrateType]), function (eCrate) {
																	if ( cCnt <= numCrate) {
																		dbMapServiceController.unitActions('updateByUnitId', serverName, {unitId: eCrate.unitId, dead: true})
																			.catch(function (err) {
																				console.log('erroring line152: ', err);
																			})
																		;
																		groupController.destroyUnit(serverName, eCrate.name);
																		cCnt ++;
																	}
																});

																if (curCrateSpecial === 'reloadGroup') {
																	reloadController.reloadSAM(serverName, curUnit, curCrate);
																// } else if (curCrateSpecial === 'repairBase') {
																//	repairController.repairBase(serverName, curUnit, curCrateType, curCrate);
																} else {
																	msg = "G: Unpacking " + _.toUpper(curCrateSpecial) + " " + curCrateType + "!";
																	exports.unpackCrate(serverName, curUnit, curCrate, curCrateType, curCrateSpecial, isCombo, isMobile);
																	groupController.destroyUnit(serverName, curCrate.name);
																	DCSLuaCommands.sendMesgToGroup(
																		curUnit.groupId,
																		serverName,
																		msg,
																		5
																	);
																}

															} else {
																DCSLuaCommands.sendMesgToGroup(
																	curUnit.groupId,
																	serverName,
																	"G: Not Enough Crates for " + curCrateType + "!(" + localCrateNum + '/' + numCrate + ")",
																	5
																);
															}
														} else {
															// no crates
															DCSLuaCommands.sendMesgToGroup(
																curUnit.groupId,
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
											} else {
												// real sling loading
												if(curUnit.inAir) {
													DCSLuaCommands.sendMesgToGroup(
														curUnit.groupId,
														serverName,
														"G: Please Land Before Attempting Logistic Commands!",
														5
													);
												} else {
													dbMapServiceController.srvPlayerActions('read', serverName, {name: curUnit.playername})
														.then(function(player) {
															var curPlayer = _.get(player, [0]);
															if (curPlayer) {
																// dbMapServiceController.staticCrateActions('read', serverName, {playerOwnerId: curPlayer.ucid})
																dbMapServiceController.staticCrateActions('read', serverName, {})
																	.then(function(crateUpdate) {
																		var sendClient = {
																			"action" : "CRATEUPDATE",
																			"crateNames": _.map(crateUpdate, '_id'),
																			"callback": 'unpackCrate',
																			"unitId": pObj.unitId
																		};
																		var actionObj = {actionObj: sendClient, queName: 'clientArray'};
																		dbMapServiceController.cmdQueActions('save', serverName, actionObj)
																			.catch(function (err) {
																				console.log('erroring line23: ', err);
																			})
																		;
																	})
																	.catch(function (err) {
																		console.log('line 244: ', err);
																	})
																;
															}
														})
														.catch(function (err) {
															console.log('line 244: ', err);
														})
													;
												}
											}
										}
									}
								})
								.catch(function (err) {
									console.log('line 125: ', err);
								})
							;
						}
						if (pObj.cmd === 'loadCrate') {
							if(curUnit.inAir) {
								DCSLuaCommands.sendMesgToGroup(
									curUnit.groupId,
									serverName,
									"G: Please Land Before Attempting Logistic Commands!",
									5
								);
							} else {
								if (!curUnit.virtCrateType) {
									proximityController.getVirtualCratesInProximity(serverName, curUnit.lonLatLoc, 0.4, curUnit.coalition)
										.then(function(units){
											var curCrate = _.find(units, {playerOwnerId: curPlayer.ucid});
											if(curCrate) {
												dbMapServiceController.unitActions('updateByUnitId', serverName, {unitId: pObj.unitId, virtCrateType: curCrate.name})
													.catch(function (err) {
														console.log('erroring line209: ', err);
													})
												;
												groupController.destroyUnit(serverName, curCrate.name);
												DCSLuaCommands.sendMesgToGroup(
													curUnit.groupId,
													serverName,
													"G: Picked Up " + _.toUpper(_.split(curCrate.name, '|')[3]) + " " + _.split(curCrate.name, '|')[2] + " Crate!",
													5
												);
											} else {
												// no troops
												DCSLuaCommands.sendMesgToGroup(
													curUnit.groupId,
													serverName,
													"G: No Crates To Load(That You Own)!",
													5
												);
											}
										})
										.catch(function (err) {
											console.log('line 32: ', err);
										})
									;
								} else {
									DCSLuaCommands.sendMesgToGroup(
										curUnit.groupId,
										serverName,
										"G: You Have a " + _.split(curUnit.virtCrateType, '|')[2] + " Already Onboard!",
										5
									);
								}
							}
						}
						if (pObj.cmd === 'dropCrate') {
							if (curUnit.inAir === true) {
								DCSLuaCommands.sendMesgToGroup(
									curUnit.groupId,
									serverName,
									"G: You Must Land Before You Can Drop A Crate!",
									5
								);
							} else {
								if (!_.isEmpty(curUnit.virtCrateType)) {
									exports.spawnCrateFromLogi(serverName, curUnit, _.split(curUnit.virtCrateType, '|')[2], _.split(curUnit.virtCrateType, '|')[4], (_.split(curUnit.virtCrateType, '|')[5] === 'true'), _.split(curUnit.virtCrateType, '|')[3], (_.split(curUnit.virtCrateType, '|')[6] === 'true'));
									dbMapServiceController.unitActions('updateByUnitId', serverName, {unitId: pObj.unitId, virtCrateType: null})
										.catch(function (err) {
											console.log('erroring line243: ', err);
										})
									;
								} else {
									DCSLuaCommands.sendMesgToGroup(
										curUnit.groupId,
										serverName,
										"G: You Have No Crates Onboard To Drop!",
										5
									);
								}
							}
						}

						// Troop Menu
						if (pObj.cmd === 'Soldier') {
							exports.loadTroops(serverName, pObj.unitId, 'Soldier');
						}

						if (pObj.cmd === 'MG Soldier') {
							exports.loadTroops(serverName, pObj.unitId, 'MG Soldier');
						}

						if (pObj.cmd === 'MANPAD') {
							exports.loadTroops(serverName, pObj.unitId, 'MANPAD');
						}

						if (pObj.cmd === 'RPG') {
							exports.loadTroops(serverName, pObj.unitId, 'RPG');
						}

						if (pObj.cmd === 'Mortar Team') {
							exports.loadTroops(serverName, pObj.unitId, 'Mortar Team');
						}

						// Crate Menu ["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "55G6 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1})
						if (pObj.cmd === 'acquisitionCnt') {
							dbMapServiceController.unitActions('read', serverName, {playerOwnerId: curPlayer.ucid, isCrate:false, isTroop: false, dead: false})
								.then(function(unitsOwned){
									var grpGroups = _.transform(unitsOwned, function (result, value) {
										(result[value.groupName] || (result[value.groupName] = [])).push(value);
									}, {});

									DCSLuaCommands.sendMesgToGroup(
										curUnit.groupId,
										serverName,
										"G: You Have " + _.size(grpGroups) + '/' + exports.maxUnitsMoving + " Unit Acquisitions In Play!",
										10
									);
								})
								.catch(function (err) {
									console.log('erroring line427: ', err);
								})
							;
						}

						if (pObj.cmd === 'EWR') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile, pObj.mass, defCrate);
						}

						if (pObj.cmd === 'JTAC') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, 'jtac', pObj.mobile, pObj.mass, defCrate);
						}

						if (pObj.cmd === 'reloadGroup') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, 'reloadGroup', pObj.mobile, pObj.mass, 'container_cargo');
						}

						if (pObj.cmd === 'repairBase') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, 'repairBase', pObj.mobile, pObj.mass, 'container_cargo');
						}

						if (pObj.cmd === 'unarmedFuel') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile, pObj.mass, defCrate);
						}

						if (pObj.cmd === 'unarmedAmmo') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile, pObj.mass, defCrate);
						}

						if (pObj.cmd === 'armoredCar') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile, pObj.mass, defCrate);
						}

						if (pObj.cmd === 'APC') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile, pObj.mass, defCrate);
						}

						if (pObj.cmd === 'tank') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile, pObj.mass, defCrate);
						}

						if (pObj.cmd === 'artillary') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile, pObj.mass, defCrate);
						}

						if (pObj.cmd === 'mlrs') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile, pObj.mass, defCrate);
						}

						if (pObj.cmd === 'stationaryAntiAir') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile, pObj.mass, defCrate);
						}

						if (pObj.cmd === 'mobileAntiAir') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile, pObj.mass, defCrate);
						}

						if (pObj.cmd === 'samIR') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile, pObj.mass, defCrate);
						}

						if (pObj.cmd === 'mobileSAM') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile, pObj.mass, defCrate);
						}

						if (pObj.cmd === 'MRSAM') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, true, '', pObj.mobile, pObj.mass, defCrate);
						}

						if (pObj.cmd === 'LRSAM') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, true, '', pObj.mobile, pObj.mass, defCrate);
						}

						//Offense Menu
						if (pObj.cmd === 'spawnBomber') {
							exports.spawnBomber(serverName, curUnit, curPlayer, pObj.type, pObj.rsCost);
						}
						if (pObj.cmd === 'spawnAtkHeli') {
							exports.spawnAtkHeli(serverName, curUnit, curPlayer, pObj.type, pObj.rsCost);
						}

						//Defense Menu
						if (pObj.cmd === 'spawnDefHeli') {
							exports.spawnDefHeli(serverName, curUnit, curPlayer, pObj.type, pObj.rsCost);
						}

						//Support Menu
						if (pObj.cmd === 'spawnAWACS') {
							exports.spawnAWACS(serverName, curUnit, curPlayer, pObj.type, pObj.rsCost);
						}
						if (pObj.cmd === 'spawnTanker') {
							exports.spawnTanker(serverName, curUnit, curPlayer, pObj.type, pObj.rsCost);
						}

						//Internal Crates
						if (pObj.cmd === 'InternalCargo') {
							exports.internalCargo(serverName, curUnit, curPlayer, pObj.type);
						}
					})
					.catch(function (err) {
						console.log('line359: ', err);
					})
				;
			}
		})
		.catch(function (err) {
			console.log('line 364: ', err);
		})
	;
});

_.set(exports, 'loadTroops', function(serverName, unitId, troopType) {
	dbMapServiceController.unitActions('read', serverName, {unitId: unitId})
		.then(function(units) {
			var curUnit = _.get(units, 0);
			if(curUnit.inAir) {
				DCSLuaCommands.sendMesgToGroup(
					curUnit.groupId,
					serverName,
					"G: Please Land Before Attempting Logistic Commands!",
					5
				);
			} else {
				dbMapServiceController.unitActions('updateByUnitId', serverName, {unitId: unitId, troopType: troopType})
					.then(function(unit) {
						DCSLuaCommands.sendMesgToGroup(
							unit.groupId,
							serverName,
							"G: " + troopType + " Has Been Loaded!",
							5
						);
					})
					.catch(function (err) {
						console.log('line 13: ', err);
					})
				;
			}
		})
		.catch(function (err) {
			console.log('line 13: ', err);
		})
	;
});

_.set(exports, 'isTroopOnboard', function (unit, serverName, verbose) {
	if (!_.isEmpty(unit.troopType)) {
		if(verbose) {
			DCSLuaCommands.sendMesgToGroup(
				unit.groupId,
				serverName,
				"G: " + unit.troopType + " is Onboard!",
				5
			);
		}
		return true;
	}
	if(verbose) {
		DCSLuaCommands.sendMesgToGroup(
			unit.groupId,
			serverName,
			"G: No Troops Onboard!",
			5
		);
	}
	return false
});

_.set(exports, 'isCrateOnboard', function (unit, serverName, verbose) {
	if (unit.virtCrateType) {
		if(verbose) {
			DCSLuaCommands.sendMesgToGroup(
				unit.groupId,
				serverName,
				"G: " + _.split(unit.virtCrateType, '|')[2] + " is Onboard!",
				5
			);
		}
		return true;
	}
	if(verbose) {
		DCSLuaCommands.sendMesgToGroup(
			unit.groupId,
			serverName,
			"G: No Crates Onboard!",
			5
		);
	}
	return false
});

_.set(exports, 'spawnCrateFromLogi', function (serverName, unit, type, crates, combo, special, mobile, mass, crateType) {
	var spc;
	var crateObj;
	var crateCount = 0;
	if (special) {
		spc = special;
	} else {
		spc = '';
	}

	if(unit.inAir) {
		DCSLuaCommands.sendMesgToGroup(
			curUnit.groupId,
			serverName,
			"G: Please Land Before Attempting Logistic Commands!",
			5
		);
	} else {
		dbMapServiceController.srvPlayerActions('read', serverName, {name: unit.playername})
			.then(function(player) {
				var curPlayer = _.get(player, [0]);
				if(menuUpdateController.virtualCrates) {
					dbMapServiceController.unitActions('read', serverName, {playerOwnerId: curPlayer.ucid, isCrate: true, dead: false})
						.then(function(delCrates) {
							_.forEach(delCrates, function (crate) {
								// console.log('cr: ', crateCount, ' > ', exports.maxCrates-1);
								if (crateCount > exports.maxCrates - 2) {
									dbMapServiceController.unitActions('updateByUnitId', serverName, {
										unitId: crate.unitId,
										dead: true
									})
										.catch(function (err) {
											console.log('erroring line387: ', err);
										})
									;
									groupController.destroyUnit(serverName, crate.name);
								}
								crateCount++;
							});
							crateObj = {
								spwnName: 'CU|' + curPlayer.ucid + '|' + type + '|' + spc + '|' + crates + '|' + combo + '|' + mobile + '|',
								type: "UAZ-469",
								lonLatLoc: unit.lonLatLoc,
								heading: unit.hdg,
								country: unit.country,
								isCrate: true,
								category: "GROUND",
								playerCanDrive: false
							};
							groupController.spawnLogiGroup(serverName, [crateObj], unit.coalition);
						})
						.catch(function (err) {
							console.log('line 358: ', err);
						})
					;
				} else {
					dbMapServiceController.baseActions('read', serverName, {mainBase: true, $or: [{side: 1}, {side: 2}]})
						.then(function (bases) {
							var checkAllBase = [];
							_.forEach(bases, function (base) {
								checkAllBase.push(proximityController.isPlayerInProximity(serverName, base.logiCenter, 0.4, unit.playername)
									.catch(function (err) {
										console.log('line 59: ', err);
									})
								)
							});

							Promise.all(checkAllBase)
								.then(function (playerProx) {
									if (_.some(playerProx)) {
										dbMapServiceController.staticCrateActions('read', serverName, {playerOwnerId: curPlayer.ucid})
											.then(function(delCrates) {
												_.forEach(delCrates, function (crate) {
													if (crateCount > exports.maxCrates - 2) {
														dbMapServiceController.staticCrateActions('delete', serverName, {
															_id: crate._id
														})
															.catch(function (err) {
																console.log('erroring line573: ', err);
															})
														;
														groupController.destroyUnit(serverName, crate._id);
													}
													crateCount++;
												});
												crateObj = {
													name: (spc) ? spc + '|#' + _.random(1000000, 9999999) : type + '|#' + _.random(1000000, 9999999),
													unitLonLatLoc: unit.lonLatLoc,
													shape_name: _.get(_.find(groupController.staticDictionary, {_id: crateType}), 'shape_name', 'iso_container_small_cargo'),
													category: 'Cargo',
													type: crateType,
													heading: unit.hdg,
													canCargo: true,
													mass: mass,
													playerOwnerId: curPlayer.ucid,
													templateName: type,
													special: spc,
													crateAmt: crates,
													isCombo: combo,
													playerCanDrive: mobile,
													country: unit.country,
													side: unit.coalition,
													coalition: unit.coalition
												};
												crateController.spawnLogiCrate(serverName, crateObj, true);

												DCSLuaCommands.sendMesgToGroup(
													unit.groupId,
													serverName,
													"G: " + _.toUpper(spc) + " " + type + " crate has been spawned!",
													5
												);
											})
											.catch(function (err) {
												console.log('line 358: ', err);
											})
										;
									} else {
										DCSLuaCommands.sendMesgToGroup(
											unit.groupId,
											serverName,
											"G: You are not close enough to the command center to spawn a crate!",
											5
										);
									}
								})
								.catch(function (err) {
									console.log('line 26: ', err);
								})
							;
						})
						.catch(function (err) {
							console.log('line 26: ', err);
						})
					;
				}
			})
			.catch(function (err) {
				console.log('line 13: ', err);
			})
		;
	}
});

_.set(exports, 'unpackCrate', function (serverName, playerUnit, country, type, special, combo, mobile) {
	if(playerUnit.inAir) {
		DCSLuaCommands.sendMesgToGroup(
			playerUnit.groupId,
			serverName,
			"G: Please Land Before Attempting Logistic Commands!",
			5
		);
	} else {
		dbMapServiceController.srvPlayerActions('read', serverName, {name: playerUnit.playername})
			.then(function(player) {
				var curPlayer = _.get(player, [0]);
				dbMapServiceController.unitActions('readStd', serverName, {playerOwnerId: curPlayer.ucid, playerCanDrive: mobile, isCrate: false, dead: false})
					.then(function(delUnits){
						var tRem;
						var curUnit = 0;
						var grpGroups = _.transform(delUnits, function (result, value) {
							(result[value.groupName] || (result[value.groupName] = [])).push(value);
						}, {});
						if (mobile) {
							tRem = _.size(grpGroups) - exports.maxUnitsMoving;
						} else {
							tRem = _.size(grpGroups) - exports.maxUnitsStationary;
						}

						_.forEach(grpGroups, function (gUnit) {
							if (curUnit <= tRem) {
								_.forEach(gUnit, function(unit) {
									dbMapServiceController.unitActions('updateByUnitId', serverName, {unitId: unit.unitId, dead: true})
										.catch(function (err) {
											console.log('erroring line462: ', err);
										})
									;
									groupController.destroyUnit(serverName, unit.name);
								});
								curUnit++;
							}
						});
					})
					.catch(function (err) {
						console.log('line 390: ', err);
					})
				;
				var newSpawnArray = [];
				if (combo) {
					groupController.getUnitDictionary()
						.then(function (unitDic) {
							var addHdg = 30;
							var curUnitHdg = playerUnit.hdg;
							var unitStart;
							var findUnits = _.filter(unitDic, {comboName: type});
							_.forEach(findUnits, function (cbUnit) {
								for (x=0; x < cbUnit.spawnCount; x++) {
									unitStart = _.cloneDeep(cbUnit);
									curUnitHdg = curUnitHdg + addHdg;
									if (curUnitHdg > 359) {
										curUnitHdg = 30;
									}
									_.set(unitStart, 'spwnName', 'DU|' + curPlayer.ucid + '|' + cbUnit.type + '|' + special + '|true|' + mobile + '|' + curPlayer.name + '|' + _.random(10000, 99999));
									_.set(unitStart, 'lonLatLoc', playerUnit.lonLatLoc);
									_.set(unitStart, 'heading', curUnitHdg);
									_.set(unitStart, 'country', country);
									_.set(unitStart, 'playerCanDrive', mobile);
									// console.log('ah1: ', curUnitHdg, addHdg, playerUnit);
									newSpawnArray.push(unitStart);
								}
							});
							groupController.spawnLogiGroup(serverName, newSpawnArray, playerUnit.coalition);
						})
						.catch(function (err) {
							console.log('line 743: ', err);
						})
					;
				} else {
					groupController.getUnitDictionary()
						.then(function (unitDic) {
							var addHdg = 30;
							var curUnitHdg = playerUnit.hdg;
							var unitStart;
							var pCountry = country;
							var findUnit = _.find(unitDic, {_id: type});
							if ((type === '1L13 EWR' || type === '55G6 EWR' || type === 'Dog Ear radar') && country === 'USA') {
								pCountry = 'UKRAINE';
							}
							for (x=0; x < findUnit.spawnCount; x++) {
								unitStart = _.cloneDeep(findUnit);
								curUnitHdg = curUnitHdg + addHdg;
								if (curUnitHdg > 359) {
									curUnitHdg = 30;
								}
								_.set(unitStart, 'spwnName', 'DU|' + curPlayer.ucid + '|' + type + '|' + special + '|true|' + mobile + '|' + curPlayer.name + '|' + _.random(10000, 99999));
								_.set(unitStart, 'lonLatLoc', playerUnit.lonLatLoc);
								_.set(unitStart, 'heading', curUnitHdg);
								_.set(unitStart, 'country', pCountry);
								_.set(unitStart, 'playerCanDrive', mobile);
								// console.log('ah2: ', curUnitHdg, addHdg, playerUnit);
								newSpawnArray.push(unitStart);
							}
							groupController.spawnLogiGroup(serverName, newSpawnArray, playerUnit.coalition);
						})
						.catch(function (err) {
							console.log('line 777: ', err);
						})
					;
				}
			})
			.catch(function (err) {
				console.log('line 390: ', err);
			})
		;
	}
});

_.set(exports, 'spawnDefHeli', function (serverName, curUnit, curPlayer, heliType, rsCost) {
	console.log('HeliType: ', heliType, rsCost);

	var heliObj;
	if(heliType === 'RussianDefHeli') {
		heliObj = {
			name: 'RussianDefHeli',
			type: 'Mi-24V',
			country: 'RUSSIA',
			alt: '1000',
			speed: '55',
			hidden: false
		};
	}
	if(heliType === 'USADefHeli') {
		heliObj = {
			name: 'USADefHeli',
			type: 'AH-1W',
			country: 'USA',
			alt: '1000',
			speed: '55',
			hidden: false
		};
	}

	resourcePointsController.spendResourcePoints(serverName, curPlayer, rsCost, 'DefHeli', heliObj)
		.then(function(spentPoints) {
			if (spentPoints) {
				groupController.spawnDefenseChopper(serverName, curUnit, heliObj);
			}
		})
		.catch(function(err) {
			console.log('err line938: ', err);
		})
	;
});

_.set(exports, 'spawnAtkHeli', function (serverName, curUnit, curPlayer, heliType, rsCost) {
	console.log('HeliType: ', heliType, rsCost);

	var heliObj;
	if(heliType === 'RussianAtkHeli') {
		heliObj = {
			name: 'RussianAtkHeli',
			type: 'Mi-28N',
			country: 'RUSSIA',
			alt: '1000',
			speed: '55',
			hidden: false
		};
	}
	if(heliType === 'USAAtkHeli') {
		heliObj = {
			name: 'USAAtkHeli',
			type: 'AH-64D',
			country: 'USA',
			alt: '1000',
			speed: '55',
			hidden: false
		};
	}

	resourcePointsController.spendResourcePoints(serverName, curPlayer, rsCost, 'AtkHeli', heliObj)
		.then(function(spentPoints) {
			if (spentPoints) {
				groupController.spawnAtkChopper(serverName, curUnit, heliObj);
			}
		})
		.catch(function(err) {
			console.log('err line938: ', err);
		})
	;
});

_.set(exports, 'spawnBomber', function (serverName, curUnit, curPlayer, bomberType, rsCost) {
	console.log('BomberType: ', bomberType, rsCost);

	var bomberObj;
	if(bomberType === 'RussianBomber') {
		bomberObj = {
			name: 'RussianBomber',
			type: 'Su-25M',
			country: 'RUSSIA',
			alt: '2000',
			speed: '233',
			spawnDistance: 50,
			details: '(3 * Su-24M)',
			hidden: false
		};
	}
	if(bomberType === 'USABomber') {
		bomberObj = {
			name: 'USABomber',
			type: 'B-1B',
			country: 'USA',
			alt: '2000',
			speed: '233',
			spawnDistance: 50,
			details: '(1 * B-1B)',
			hidden: false
		};
	}

	resourcePointsController.spendResourcePoints(serverName, curPlayer, rsCost, 'Bomber', bomberObj)
		.then(function(spentPoints) {
			if (spentPoints) {
				groupController.spawnBomberPlane(serverName, curUnit, bomberObj);
			}
		})
		.catch(function(err) {
			console.log('err line938: ', err);
		})
	;
});


_.set(exports, 'spawnAWACS', function (serverName, curUnit, curPlayer, awacsType, rsCost) {
	console.log('AWACSType: ', awacsType, rsCost);

	var awacsObj;
	if(awacsType === 'RussianAWACS') {
		awacsObj = {
			name: 'RussianAWACS',
			type: 'A-50',
			country: 'RUSSIA',
			alt: '7620',
			speed: '265',
			radioFreq: 138000000,
			spawnDistance: 50,
			callsign: 50,
			onboard_num: 250,
			details: '(CALLSIGN: Overlord, Freq: 138Mhz AM)',
			hidden: false
		};
	}
	if(awacsType === 'USAAWACS') {
		awacsObj = {
			name: 'USAAWACS',
			type: 'E-3A',
			country: 'USA',
			alt: '7620',
			speed: '265',
			radioFreq: 139000000,
			spawnDistance: 50,
			callsign: {
				'1': 1,
				'2': 1,
				'3': 1,
				name: 'Overlord11'
			},
			onboard_num: 249,
			details: '(CALLSIGN: Overlord, Freq: 139Mhz AM)',
			hidden: false
		};
	}

	resourcePointsController.spendResourcePoints(serverName, curPlayer, rsCost, 'AWACS', awacsObj)
		.then(function(spentPoints) {
			if (spentPoints) {
				groupController.spawnAWACSPlane(serverName, curUnit, awacsObj);
			}
		})
		.catch(function(err) {
			console.log('err line938: ', err);
		})
	;
});


_.set(exports, 'spawnTanker', function (serverName, curUnit, curPlayer, tankerType, rsCost) {
	console.log('tankerType: ', tankerType, rsCost);

	var tankerObj;
	if(tankerType === 'BHABTKR') {
		tankerObj = {
			name: 'BHABTKR',
			type: 'KC-135',
			country: 'USA',
			alt: '7620',
			speed: '265',
			tacan: {
				enabled: true,
				channel: 33,
				modeChannel: 'Y',
				frequency: 1120000000,
			},
			radioFreq: 125000000,
			spawnDistance: 50,
			callsign: {
				'1': 2,
				'2': 1,
				'3': 1,
				name: 'Arco11'
			},
			onboard_num: 135,
			details: '(TACAN: 33X, CALLSIGN: Arco, Freq: 125Mhz AM)',
			hidden: false
		};
	}
	if(tankerType === 'BHADTKR') {
		tankerObj = {
			name: 'BHADTKR',
			type: 'IL-78M',
			country: 'UKRAINE',
			alt: '7620',
			speed: '265',
			tacan: {
				enabled: false
			},
			radioFreq: 126000000,
			spawnDistance: 50,
			callsign: 78,
			onboard_num: 78,
			details: '(CALLSIGN: 78, Freq: 126Mhz AM)',
			hidden: false
		};
	}
	if(tankerType === 'BLABTKR') {
		tankerObj = {
			name: 'BLABTKR',
			type: 'KC-135',
			country: 'USA',
			alt: '4572',
			speed: '118.19444444444',
			tacan: {
				enabled: true,
				channel: 35,
				modeChannel: 'Y',
				frequency: 1122000000,
			},
			radioFreq: 127500000,
			spawnDistance: 50,
			callsign: {
				'1': 3,
				'2': 1,
				'3': 1,
				name: 'Shell11'
			},
			onboard_num: 135,
			details: '(TACAN: 35X, CALLSIGN: Shell, Freq: 127.5Mhz AM)',
			hidden: false
		};
	}
	if(tankerType === 'BLADTKR') {
		tankerObj = {
			name: 'BLADTKR',
			type: 'KC130',
			country: 'USA',
			alt: '4572',
			speed: '169.58333333333',
			tacan: {
				enabled: true,
				channel: 36,
				modeChannel: 'Y',
				frequency: 1123000000,
			},
			radioFreq: 128000000,
			spawnDistance: 50,
			callsign: {
				'1': 1,
				'2': 1,
				'3': 1,
				name: 'Texaco11'
			},
			onboard_num: 130,
			details: '(TACAN: 36X, CALLSIGN: Texaco, Freq: 128Mhz AM)',
			hidden: false
		};
	}
	if(tankerType === 'RHADTKR') {
		tankerObj = {
			name: 'RHADTKR',
			type: 'IL-78M',
			country: 'RUSSIA',
			alt: '7620',
			speed: '265',
			tacan: {
				enabled: false
			},
			radioFreq: 130000000,
			spawnDistance: 50,
			callsign: 78,
			onboard_num: 78,
			details: '(CALLSIGN: 78, Freq: 130Mhz AM)',
			hidden: false
		};
	}
	if(tankerType === 'RLABTKR') {
		tankerObj = {
			name: 'RLABTKR',
			type: 'KC-135',
			country: 'AGGRESSORS',
			alt: '4572',
			speed: '118.19444444444',
			tacan: {
				enabled: true,
				channel: 43,
				modeChannel: 'Y',
				frequency: 1130000000
			},
			radioFreq: 131000000,
			spawnDistance: 50,
			callsign: {
				'1': 1,
				'2': 1,
				'3': 1,
				name: 'Texaco11'
			},
			onboard_num: 135,
			details: '(TACAN: 43X, CALLSIGN: Texaco, Freq: 131Mhz AM)',
			hidden: false
		};
	}
	if(tankerType === 'RLADTKR') {
		tankerObj = {
			name: 'RLADTKR',
			type: 'KC130',
			country: 'RUSSIA',
			alt: '4572',
			speed: '169.58333333333',
			tacan: {
				enabled: true,
				channel: 44,
				modeChannel: 'Y',
				frequency: 1131000000
			},
			radioFreq: 132000000,
			spawnDistance: 50,
			callsign: 130,
			onboard_num: 130,
			details: '(TACAN: 44X, CALLSIGN: 130, Freq: 132Mhz AM)',
			hidden: false
		};
	}

	resourcePointsController.spendResourcePoints(serverName, curPlayer, rsCost, 'Tanker', tankerObj)
		.then(function(spentPoints) {
			if (spentPoints) {
				groupController.spawnTankerPlane(serverName, curUnit, tankerObj);
			}
		})
		.catch(function(err) {
			console.log('err line938: ', err);
		})
	;
});

_.set(exports, 'internalCargo', function (serverName, curUnit, curPlayer, intCargoType) {
	// console.log('tankerType: ', tankerType, rsCost);
	// InternalCargo
	// loaded, unpack, jtac, BaseRepair
	if(intCargoType === 'loaded') {
		if(curUnit.intCargoType) {
			DCSLuaCommands.sendMesgToGroup(
				curUnit.groupId,
				serverName,
				"G: " + curUnit.intCargoType + " Internal Crate is Onboard!",
				5
			);
		} else {
			DCSLuaCommands.sendMesgToGroup(
				curUnit.groupId,
				serverName,
				"G: No Internal Crates Onboard!",
				5
			);
		}
	}
	if(intCargoType === 'unpack') {
		proximityController.getLogiTowersProximity(serverName, curUnit.lonLatLoc, 1)
			.then(function (logiProx) {
				var curIntCrateType = _.split(curUnit.intCargoType, '|')[1];
				var curIntCrateBaseOrigin = _.split(curUnit.intCargoType, '|')[2];
				var crateType = (curUnit.coalition === 1)?'UAZ-469':'Hummer';
				if (logiProx.length) {
					DCSLuaCommands.sendMesgToGroup(
						curUnit.groupId,
						serverName,
						"G: You need to move farther away from Command Towers for internal cargo (1.5km)",
						5
					);
				} else {
					if (curUnit.inAir) {
						DCSLuaCommands.sendMesgToGroup(
							curUnit.groupId,
							serverName,
							"G: Please Land Before Attempting Cargo Commands!",
							5
						);
					} else {
						if (curIntCrateType) {
							if(curIntCrateType === 'JTAC') {
								exports.unpackCrate(serverName, curUnit, curUnit.country, crateType, 'jtac', false, true);
								dbMapServiceController.unitActions('updateByUnitId', serverName, {unitId: curUnit.unitId, intCargoType: ''})
									.then(function () {
										DCSLuaCommands.sendMesgToGroup(
											curUnit.groupId,
											serverName,
											"G: You Have Spawned A JTAC Unit From Internal Cargo!",
											5
										);
									})
									.catch(function (err) {
										console.log('erroring line209: ', err);
									})
								;
							}
							if(curIntCrateType === 'BaseRepair') {
								dbMapServiceController.baseActions('read', serverName, {mainBase: true, side: curUnit.coalition})
									.then(function (bases) {
										_.forEach(bases, function (base) {
											proximityController.getPlayersInProximity(serverName, _.get(base, 'centerLoc'), 3.4, false, base.side)
												.then(function (unitsInProx) {
													if(unitsInProx.length > 0) {
														if (repairController.repairBase(serverName, base, curUnit, curIntCrateBaseOrigin)) {
															dbMapServiceController.unitActions('updateByUnitId', serverName, {unitId: curUnit.unitId, intCargoType: ''})
																.catch(function (err) {
																	console.log('erroring line209: ', err);
																})
															;
														}
													}
												})
												.catch(function (err) {
													console.log('line 64: ', err);
												})
											;
										});
									})
									.catch(function (err) {
										console.log('line 64: ', err);
									})
								;
							}
						} else {
							DCSLuaCommands.sendMesgToGroup(
								curUnit.groupId,
								serverName,
								"G: No Internal Crates Onboard!",
								5
							);
						}
					}
				}
			})
			.catch(function(err) {
				console.log('err line1072: ', err);
			})
		;
	}
	if(intCargoType === 'loadJTAC' || intCargoType === 'loadBaseRepair') {
		proximityController.getLogiTowersProximity(serverName, curUnit.lonLatLoc, 1.2)
			.then(function (logiProx) {
				var curLogiName = _.get(logiProx, [0, 'name']);
				if(logiProx.length) {
					if(curUnit.inAir) {
						DCSLuaCommands.sendMesgToGroup(
							curUnit.groupId,
							serverName,
							"G: Please Land Before Attempting Cargo Commands!",
							5
						);
					} else {
						if(intCargoType === 'loadJTAC') {
							dbMapServiceController.unitActions('updateByUnitId', serverName, {unitId: curUnit.unitId, intCargoType: '|JTAC|' + curLogiName + '|'})
								.then(function () {
									DCSLuaCommands.sendMesgToGroup(
										curUnit.groupId,
										serverName,
										'G: Picked Up A JTAC Internal Crate From ' + curLogiName + '!',
										5
									);
								})
								.catch(function (err) {
									console.log('erroring line209: ', err);
								})
							;
						}
						if(intCargoType === 'loadBaseRepair') {
							dbMapServiceController.unitActions('updateByUnitId', serverName, {unitId: curUnit.unitId, intCargoType: '|BaseRepair|' + curLogiName + '|'})
								.then(function () {
									DCSLuaCommands.sendMesgToGroup(
										curUnit.groupId,
										serverName,
										'G: Picked Up A Base Repair Internal Crate From ' + curLogiName + '!',
										5
									);
								})
								.catch(function (err) {
									console.log('erroring line209: ', err);
								})
							;
						}
					}
				} else {
					DCSLuaCommands.sendMesgToGroup(
						curUnit.groupId,
						serverName,
						"G: You are not close enough to a command center!",
						5
					);
				}
			})
			.catch(function(err) {
				console.log('err line1072: ', err);
			})
		;
	}
});
