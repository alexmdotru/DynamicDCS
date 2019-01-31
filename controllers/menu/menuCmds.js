const	_ = require('lodash');
const constants = require('../constants');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const masterDBController = require('../db/masterDB');
const proximityController = require('../proxZone/proximity');
const menuUpdateController = require('../menu/menuUpdate');
const groupController = require('../spawn/group');
const crateController = require('../spawn/crate');
const reloadController = require('../menu/reload');
const repairController = require('../menu/repair');
const userLivesController = require('../action/userLives');
const resourcePointsController = require('../action/resourcePoints');
const serverTimerController = require('../action/serverTimer');

_.assign(exports, {
	internalCargo: function (serverName, curUnit, curPlayer, intCargoType) {
		// console.log('tankerType: ', tankerType, rsCost);
		// InternalCargo
		// loaded, unpack, jtac, BaseRepair
		var checkAllBase = [];
		var crateObj;
		var crateCount = 0;
		var curBaseName;
		var curBaseObj;
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
			var intCargo = _.split(curUnit.intCargoType, '|');
			var curIntCrateType = intCargo[1];
			var curIntCrateBaseOrigin = intCargo[2];
			var crateType = (curUnit.coalition === 1)?'UAZ-469':'Hummer';
			if (curUnit.inAir) {
				DCSLuaCommands.sendMesgToGroup(
					curUnit.groupId,
					serverName,
					"G: Please Land Before Attempting Cargo Commands!",
					5
				);
			} else {
				if (curIntCrateType) {
					checkAllBase = [];
					masterDBController.baseActions('read', serverName, {})
						.then(function (bases) {
							_.forEach(bases, function (base) {
								checkAllBase.push(proximityController.isPlayerInProximity(serverName, base.centerLoc, 3.4, curUnit.playername)
									.then(function (playerAtBase) {
										if (playerAtBase) {
											curBaseObj = base;
										}
										return playerAtBase;
									})
									.catch(function (err) {
										console.log('line 59: ', err);
									})
								)
							});
							Promise.all(checkAllBase)
								.then(function (playerProx) {
									// console.log('player prox: ', playerProx, _.some(playerProx)); _.some(playerProx)
									curBaseName = _.first(_.split(_.get(curBaseObj, 'name'), ' #'));
									console.log('intCurUnpackBaseAt: ', curBaseName);
									if(curIntCrateBaseOrigin === curBaseName) {
										DCSLuaCommands.sendMesgToGroup(
											curUnit.groupId,
											serverName,
											"G: You can't unpack this internal crate from same base it is acquired!",
											5
										);
									} else {
										if(curIntCrateType === 'JTAC') {
											exports.unpackCrate(serverName, curUnit, curUnit.country, crateType, 'jtac', false, true);
											masterDBController.unitActions('updateByUnitId', serverName, {unitId: curUnit.unitId, intCargoType: ''})
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
											if (_.some(playerProx)) {
												repairController.repairBase(serverName, curBaseObj, curUnit);
											} else {
												DCSLuaCommands.sendMesgToGroup(
													curUnit.groupId,
													serverName,
													"G: You are not near any bases!",
													5
												);
											}
										}
										if(curIntCrateType === 'CCBuild') {  // serverName, curUnit, curPlayer, intCargoType
											constants.getServer(serverName)
												.then(function(serverInfo) {
													masterDBController.staticCrateActions('read', serverName, {playerOwnerId: curPlayer.ucid})
														.then(function(delCrates) {
															_.forEach(delCrates, function (crate) {
																if (crateCount > serverInfo.maxCrates - 2) {
																	masterDBController.staticCrateActions('delete', serverName, {
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
																name: curUnit.intCargoType + '|#' + _.random(1000000, 9999999),
																unitLonLatLoc: curUnit.lonLatLoc,
																shape_name: 'iso_container_small_cargo',
																category: 'Cargo',
																type: 'iso_container_small',
																heading: curUnit.hdg,
																canCargo: true,
																mass: 500,
																playerOwnerId: curPlayer.ucid,
																templateName: 'CCBuild',
																special: curUnit.intCargoType,
																crateAmt: 1,
																isCombo: false,
																playerCanDrive: false,
																country: _.get(constants, ['defCountrys', curUnit.coalition]),
																side: curUnit.coalition,
																coalition: curUnit.coalition
															};
															crateController.spawnLogiCrate(serverName, crateObj, true);
															masterDBController.unitActions('updateByUnitId', serverName, {unitId: curUnit.unitId, intCargoType: ''})
																.catch(function (err) {
																	console.log('erroring line209: ', err);
																})
															;
															DCSLuaCommands.sendMesgToGroup(
																curUnit.groupId,
																serverName,
																"G: Command Center Build crate has been spawned!",
																5
															);
														})
														.catch(function (err) {
															console.log('line 1359: ', err);
														})
													;
												})
												.catch(function (err) {
													console.log('line 1359: ', err);
												})
											;
										}
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
					DCSLuaCommands.sendMesgToGroup(
						curUnit.groupId,
						serverName,
						"G: No Internal Crates Onboard!",
						5
					);
				}
			}
		}
		if(intCargoType === 'loadJTAC' || intCargoType === 'loadBaseRepair' || intCargoType === 'loadCCBuild') {
			checkAllBase = [];
			if(curUnit.inAir) {
				DCSLuaCommands.sendMesgToGroup(
					curUnit.groupId,
					serverName,
					"G: Please Land Before Attempting Cargo Commands!",
					5
				);
			} else {
				masterDBController.baseActions('read', serverName, {})
					.then(function (bases) {
						_.forEach(bases, function (base) {
							checkAllBase.push(proximityController.isPlayerInProximity(serverName, base.centerLoc, 3.4, curUnit.playername)
								.then(function (playerAtBase) {
									if (playerAtBase) {
										curBaseObj = base;
									}
									return playerAtBase;
								})
								.catch(function (err) {
									console.log('line 59: ', err);
								})
							)
						});
						Promise.all(checkAllBase)
							.then(function (playerProx) {
								// console.log('playerResp: ', curBaseObj);
								if(_.some(playerProx)) {
									curBaseName = _.first(_.split(_.get(curBaseObj, 'name'), ' #'));
									console.log('intCurBaseAt: ', curBaseName);
									masterDBController.unitActions('read', serverName, {name: curBaseName + ' Logistics', dead: false})
										.then(function (aliveLogistics) {
											if (aliveLogistics.length > 0) {
												if(intCargoType === 'loadJTAC') {
													masterDBController.unitActions('updateByUnitId', serverName, {unitId: curUnit.unitId, intCargoType: '|JTAC|' + curBaseName + '|'})
														.then(function () {
															DCSLuaCommands.sendMesgToGroup(
																curUnit.groupId,
																serverName,
																'G: Picked Up A JTAC Internal Crate From ' + curBaseName + '!',
																5
															);
														})
														.catch(function (err) {
															console.log('erroring line209: ', err);
														})
													;
												}
												if(intCargoType === 'loadBaseRepair') {
													masterDBController.unitActions('updateByUnitId', serverName, {unitId: curUnit.unitId, intCargoType: '|BaseRepair|' + curBaseName + '|'})
														.then(function () {
															DCSLuaCommands.sendMesgToGroup(
																curUnit.groupId,
																serverName,
																'G: Picked Up A Base Repair Internal Crate From ' + curBaseName + '!',
																5
															);
														})
														.catch(function (err) {
															console.log('erroring line1363: ', err);
														})
													;
												}
												if(intCargoType === 'loadCCBuild') {
													masterDBController.unitActions('updateByUnitId', serverName, {unitId: curUnit.unitId, intCargoType: '|CCBuild|' + curBaseName + '|'})
														.then(function () {
															DCSLuaCommands.sendMesgToGroup(
																curUnit.groupId,
																serverName,
																'G: Picked Up A Base Command Center Build Crate From ' + curBaseName + '!',
																5
															);
														})
														.catch(function (err) {
															console.log('erroring line1378: ', err);
														})
													;
												}
											} else {
												DCSLuaCommands.sendMesgToGroup(
													curUnit.groupId,
													serverName,
													"G: " + curBaseName + " logistical supply system is cut, repair the base!",
													5
												);
											}
										})
										.catch(function (err) {
											console.log('erroring line1363: ', err);
										})
									;
								} else {
									DCSLuaCommands.sendMesgToGroup(
										curUnit.groupId,
										serverName,
										"G: You are not within 2km of a friendly base to load internal crate!",
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
		}
	},
	isCrateOnboard: function (unit, serverName, verbose) {
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
	},
	isTroopOnboard: function (unit, serverName, verbose) {
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
	},
	loadTroops: function(serverName, unitId, troopType) {
		masterDBController.unitActions('read', serverName, {unitId: unitId})
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
					masterDBController.baseActions('read', serverName, {mainBase: true, side: curUnit.coalition})
						.then(function (bases) {
							checkAllBase = [];
							_.forEach(bases, function (base) {
								checkAllBase.push(proximityController.isPlayerInProximity(serverName, base.centerLoc, 3.4, curUnit.playername)
									.catch(function (err) {
										console.log('line 59: ', err);
									})
								)
							});

							Promise.all(checkAllBase)
								.then(function (playerProx) {
									if (_.some(playerProx)) {
										masterDBController.unitActions('updateByUnitId', serverName, {unitId: unitId, troopType: troopType})
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
									} else {
										//secondary check for second base distance
										masterDBController.baseActions('read', serverName)
											.then(function (bases) {
												checkAllBase = [];
												var curLogistic;
												masterDBController.unitActions('read', serverName, {_id:  /Logistics/, dead: false, coalition: curUnit.coalition})
													.then(function(aliveBases) {
														_.forEach(bases, function (base) {
															curLogistic = _.find(aliveBases, {name: base.name + ' Logistics'});
															if (!!curLogistic) {
																checkAllBase.push(proximityController.isPlayerInProximity(serverName, _.get(curLogistic, 'lonLatLoc'), 0.2, curUnit.playername)
																	.catch(function (err) {
																		console.log('line 59: ', err);
																	})
																)
															}
														});
														Promise.all(checkAllBase)
															.then(function (playerProx) {
																if (_.some(playerProx)) {
																	masterDBController.unitActions('updateByUnitId', serverName, {unitId: unitId, troopType: troopType})
																		.then(function(unit) {
																			DCSLuaCommands.sendMesgToGroup(
																				curUnit.groupId,
																				serverName,
																				"G: " + troopType + " Has Been Loaded!",
																				5
																			);
																		})
																		.catch(function (err) {
																			console.log('line 13: ', err);
																		})
																	;
																} else {
																	DCSLuaCommands.sendMesgToGroup(
																		curUnit.groupId,
																		serverName,
																		"G: You are too far from a friendly base to load troops!",
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
														console.log('line 13: ', err);
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
	},
	menuCmdProcess: function (serverName, sessionName, pObj) {
		var defCrate = 'iso_container_small';
		//var defCrate = (_.toNumber(pObj.mass) > 1000)?'iso_container':'iso_container_small';
		// console.log('process menu cmd: ', pObj);
		masterDBController.unitActions('read', serverName, {unitId: pObj.unitId})
			.then(function(units) {
				var curUnit = _.get(units, 0);
				if (curUnit) {
					masterDBController.srvPlayerActions('read', serverName, {name: curUnit.playername})
						.then(function(player) {
							var curPlayer = _.get(player, [0]);
							if (curPlayer) {
								var spawnArray;
								var curSpawnUnit;
								// action menu
								if (pObj.cmd === 'serverTimeLeft') {
									serverTimerController.timeLeft(serverName, curUnit);
								}
								if (pObj.cmd === 'lookupAircraftCosts') {
									userLivesController.lookupAircraftCosts(serverName, curPlayer.ucid);
								}
								if (pObj.cmd === 'lookupLifeResource') {
									userLivesController.lookupLifeResource(serverName, curPlayer.ucid);
								}
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
											checkAllBase = [];
											masterDBController.baseActions('read', serverName, {mainBase: true, side: curUnit.coalition})
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
																masterDBController.unitActions('updateByUnitId', serverName, {unitId: pObj.unitId, troopType: null})
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
																var curTroops = [];
																if (_.get(constants, 'config.timePeriod') === '1978ColdWar') {
																	masterDBController.unitActions('read', serverName, {playerOwnerId: curPlayer.ucid, isTroop: true, dead: false})
																		.then(function(delUnits){
																			_.forEach(delUnits, function (unit) {
																				masterDBController.unitActions('updateByUnitId', serverName, {unitId: unit.unitId, dead: true});
																				groupController.destroyUnit(serverName, unit.name);
																			});
																			// spawn troop type
																			curSpawnUnit = _.cloneDeep(_.first(groupController.getRndFromSpawnCat(curUnit.troopType, curUnit.coalition, false, true)));
																			spawnArray = {
																				spwnName: 'TU|' + curPlayer.ucid + '|' + curUnit.troopType + '|' + curUnit.playername + '|' + _.random(1000000, 9999999) ,
																				type: curSpawnUnit.type,
																				lonLatLoc: curUnit.lonLatLoc,
																				heading: curUnit.hdg,
																				country: curUnit.country,
																				category: curSpawnUnit.category,
																				playerCanDrive: true
																			};
																			for(var x = 0; x < 6; x++) {
																				curTroops.push(spawnArray);
																			}
																			masterDBController.unitActions('updateByUnitId', serverName, {unitId: pObj.unitId, troopType: null})
																				.catch(function (err) {
																					console.log('erroring line73: ', err);
																				})
																			;
																			groupController.spawnLogiGroup(serverName, curTroops, curUnit.coalition);
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
																} else {
																	masterDBController.unitActions('read', serverName, {playerOwnerId: curPlayer.ucid, isTroop: true, dead: false})
																		.then(function(delUnits){
																			_.forEach(delUnits, function (unit) {
																				masterDBController.unitActions('updateByUnitId', serverName, {unitId: unit.unitId, dead: true});
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
																			masterDBController.unitActions('updateByUnitId', serverName, {unitId: pObj.unitId, troopType: null})
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
													var curTroop = _.first(units);
													if(curTroop) {
														// pickup troop
														masterDBController.unitActions('read', serverName, {groupName: curTroop.groupName, isCrate: false, dead: false})
															.then(function(grpUnits) {
																_.forEach(grpUnits, function (curUnit) {
																	groupController.destroyUnit(serverName, curUnit.name);
																});
																masterDBController.unitActions('updateByUnitId', serverName, {unitId: pObj.unitId, troopType: curTroop.spawnCat})
																	.catch(function (err) {
																		console.log('erroring line57: ', err);
																	})
																;
																DCSLuaCommands.sendMesgToGroup(
																	curUnit.groupId,
																	serverName,
																	"G: Picked Up " + curTroop.type + "!",
																	5
																);

															})
															.catch(function (err) {
																console.log('erroring line57: ', err);
															})
														;
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
													console.log('line150: ', err);
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
								proximityController.getLogiTowersProximity(serverName, curUnit.lonLatLoc, 0.8, curUnit.coalition)
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
													proximityController.getVirtualCratesInProximity(serverName, curUnit.lonLatLoc, 0.2, curUnit.coalition)
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
																			masterDBController.unitActions('updateByUnitId', serverName, {unitId: eCrate.unitId, dead: true})
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
																	if (localCrateNum) {
																		DCSLuaCommands.sendMesgToGroup(
																			curUnit.groupId,
																			serverName,
																			"G: Not Enough Crates for " + curCrateType + "!(" + localCrateNum + '/' + numCrate + ")",
																			5
																		);
																	} else {
																		DCSLuaCommands.sendMesgToGroup(
																			curUnit.groupId,
																			serverName,
																			"G: No Crates In Area!",
																			5
																		);
																	}
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
														masterDBController.srvPlayerActions('read', serverName, {name: curUnit.playername})
															.then(function(player) {
																var curPlayer = _.get(player, [0]);
																if (curPlayer) {
																	// masterDBController.staticCrateActions('read', serverName, {playerOwnerId: curPlayer.ucid})
																	masterDBController.staticCrateActions('read', serverName, {})
																		.then(function(crateUpdate) {
																			var sendClient = {
																				"action" : "CRATEUPDATE",
																				"crateNames": _.map(crateUpdate, '_id'),
																				"callback": 'unpackCrate',
																				"unitId": pObj.unitId
																			};
																			var actionObj = {actionObj: sendClient, queName: 'clientArray'};
																			masterDBController.cmdQueActions('save', serverName, actionObj)
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
										proximityController.getVirtualCratesInProximity(serverName, curUnit.lonLatLoc, 0.2, curUnit.coalition)
											.then(function(units){
												var curCrate = _.find(units, {playerOwnerId: curPlayer.ucid});
												if(curCrate) {
													masterDBController.unitActions('updateByUnitId', serverName, {unitId: pObj.unitId, virtCrateType: curCrate.name})
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
										masterDBController.unitActions('updateByUnitId', serverName, {unitId: pObj.unitId, virtCrateType: null})
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
								masterDBController.unitActions('read', serverName, {playerOwnerId: curPlayer.ucid, isCrate:false, isTroop: false, dead: false})
									.then(function(unitsOwned){
										constants.getServer(serverName)
											.then(function(serverInfo) {
												var grpGroups = _.transform(unitsOwned, function (result, value) {
													(result[value.groupName] || (result[value.groupName] = [])).push(value);
												}, {});

												DCSLuaCommands.sendMesgToGroup(
													curUnit.groupId,
													serverName,
													"G: You Have " + _.size(grpGroups) + '/' + serverInfo.maxUnitsMoving + " Unit Acquisitions In Play!",
													10
												);
											})
											.catch(function (err) {
												console.log('erroring line427: ', err);
											})
										;
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
							console.log('line537: ', err);
						})
					;
				}
			})
			.catch(function (err) {
				console.log('line 543: ', err);
			})
		;
	},
	spawnAtkHeli: function (serverName, curUnit, curPlayer, heliType, rsCost) {
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
	},
	spawnAWACS: function (serverName, curUnit, curPlayer, awacsType, rsCost) {
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
	},
	spawnBomber: function (serverName, curUnit, curPlayer, bomberType, rsCost) {
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
	},
	spawnCrateFromLogi: function (serverName, unit, type, crates, combo, special, mobile, mass, crateType) {
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
				unit.groupId,
				serverName,
				"G: Please Land Before Attempting Logistic Commands!",
				5
			);
		} else {
			constants.getServer(serverName)
				.then(function(serverInfo) {
					// console.log('SERVERI: ', serverName, serverInfo);
					masterDBController.srvPlayerActions('read', serverName, {name: unit.playername})
						.then(function(player) {
							var curPlayer = _.get(player, [0]);
							if(menuUpdateController.virtualCrates) {
								masterDBController.unitActions('read', serverName, {playerOwnerId: curPlayer.ucid, isCrate: true, dead: false})
									.then(function(delCrates) {
										_.forEach(delCrates, function (crate) {
											// console.log('cr: ', crateCount, ' > ', serverInfo.maxCrates-1);
											if (crateCount > serverInfo.maxCrates - 2) {
												masterDBController.unitActions('updateByUnitId', serverName, {
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
								masterDBController.baseActions('read', serverName)
									.then(function (bases) {
										checkAllBase = [];
										var curLogistic;
										masterDBController.unitActions('read', serverName, {_id:  /Logistics/, dead: false, coalition: unit.coalition})
											.then(function(aliveBases) {
												_.forEach(bases, function (base) {
													curLogistic = _.find(aliveBases, {name: base.name + ' Logistics'});
													if (!!curLogistic) {
														checkAllBase.push(proximityController.isPlayerInProximity(serverName, _.get(curLogistic, 'lonLatLoc'), 0.2, unit.playername)
															.catch(function (err) {
																console.log('line 59: ', err);
															})
														)
													}
												});
												Promise.all(checkAllBase)
													.then(function (playerProx) {
														// console.log('SC: ', _.some(playerProx), playerProx);
														if (_.some(playerProx)) {
															masterDBController.staticCrateActions('read', serverName, {playerOwnerId: curPlayer.ucid})
																.then(function(delCrates) {
																	_.forEach(delCrates, function (crate) {
																		if (crateCount > serverInfo.maxCrates - 2) {
																			masterDBController.staticCrateActions('delete', serverName, {
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
																		shape_name: _.get(_.find(constants.staticDictionary, {_id: crateType}), 'shape_name', 'iso_container_small_cargo'),
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
																		country: _.get(constants, ['defCountrys', unit.coalition]),
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
												console.log('line 13: ', err);
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
				})
				.catch(function (err) {
					console.log('line 358: ', err);
				})
			;
		}
	},
	spawnDefHeli: function (serverName, curUnit, curPlayer, heliType, rsCost) {
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
	},
	spawnTanker: function (serverName, curUnit, curPlayer, tankerType, rsCost) {
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
	},
	unpackCrate: function (serverName, playerUnit, country, type, special, combo, mobile) {
		return new Promise(function(resolve, reject) {
			if(playerUnit.inAir) {
				DCSLuaCommands.sendMesgToGroup(
					playerUnit.groupId,
					serverName,
					"G: Please Land Before Attempting Logistic Commands!",
					5
				);
				resolve(false);
			} else {
				masterDBController.srvPlayerActions('read', serverName, {name: playerUnit.playername})
					.then(function(player) {
						var curPlayer = _.get(player, [0]);
						masterDBController.unitActions('readStd', serverName, {playerOwnerId: curPlayer.ucid, playerCanDrive: mobile, isCrate: false, dead: false})
							.then(function(delUnits){
								constants.getServer(serverName)
									.then(function(serverInfo) {
										var tRem;
										var curUnit = 0;
										var grpGroups = _.transform(delUnits, function (result, value) {
											(result[value.groupName] || (result[value.groupName] = [])).push(value);
										}, {});
										tRem = _.size(grpGroups) - serverInfo.maxUnitsMoving;

										_.forEach(grpGroups, function (gUnit) {
											if (curUnit <= tRem) {
												_.forEach(gUnit, function(unit) {
													masterDBController.unitActions('updateByUnitId', serverName, {unitId: unit.unitId, dead: true})
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
							})
							.catch(function (err) {
								console.log('line 390: ', err);
							})
						;
						var newSpawnArray = [];
						if (combo) {
							constants.getUnitDictionary(_.get(constants, 'config.timePeriod', 'modern'))
								.then(function (unitDic) {
									var addHdg = 30;
									var curUnitHdg = playerUnit.hdg;
									var unitStart;
									var findUnits = _.filter(unitDic, {comboName: type});
									_.forEach(findUnits, function (cbUnit) {
										for (x=0; x < cbUnit.spawnCount; x++) {
											unitStart = _.cloneDeep(cbUnit);
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
											curUnitHdg = curUnitHdg + addHdg;
										}
									});
									groupController.spawnLogiGroup(serverName, newSpawnArray, playerUnit.coalition);
									resolve(true);
								})
								.catch(function (err) {
									reject(err);
									console.log('line 743: ', err);
								})
								;
						} else {
							constants.getUnitDictionary(_.get(constants, 'config.timePeriod', 'modern'))
								.then(function (unitDic) {
									var addHdg = 30;
									var curUnitHdg = playerUnit.hdg;
									var unitStart;
									var pCountry = country;
									var findUnit = _.find(unitDic, {_id: type});
									if ((type === '1L13 EWR' || type === '55G6 EWR' || type === 'Dog Ear radar') && _.get(playerUnit, 'coalition') === 2) {
										console.log('EWR: UKRAINE');
										pCountry = 'UKRAINE';
									}
									for (x=0; x < findUnit.spawnCount; x++) {
										unitStart = _.cloneDeep(findUnit);
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
										curUnitHdg = curUnitHdg + addHdg;
									}
									groupController.spawnLogiGroup(serverName, newSpawnArray, playerUnit.coalition);
									resolve(true);
								})
								.catch(function (err) {
									reject(err);
									console.log('line 777: ', err);
								})
								;
						}
					})
					.catch(function (err) {
						reject(err);
						console.log('line 390: ', err);
					})
					;
			}
		});
	}
});
