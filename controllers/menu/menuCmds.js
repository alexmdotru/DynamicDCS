const	_ = require('lodash');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const dbMapServiceController = require('../db/dbMapService');
const proximityController = require('../proxZone/proximity');
const menuUpdateController = require('../menu/menuUpdate');
const groupController = require('../spawn/group');
const reloadController = require('../menu/reload');
const repairController = require('../menu/repair');
const capLivesController = require('../action/capLives');

exports.maxCrates = 10;
exports.maxTroops = 1;
exports.maxUnitsMoving = 5;
exports.maxUnitsStationary = 5;
exports.spawnLauncherCnt = 3;

_.set(exports, 'menuCmdProcess', function (serverName, sessionName, pObj) {
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
							if (pObj.cmd === 'Lives') {
								capLivesController.checkLives(serverName, curPlayer.ucid);
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
										// console.log('should be false: ', proximityController.extractUnitsBackToBase(curUnit, serverName) );
										if(proximityController.extractUnitsBackToBase(curUnit, serverName)) {
											dbMapServiceController.unitActions('update', serverName, {unitId: pObj.unitId, troopType: null})
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
														dbMapServiceController.unitActions('update', serverName, {unitId: unit.unitId, dead: true});
														groupController.destroyUnit(serverName, unit.name);
													});
													// spawn troop type
													curSpawnUnit = _.cloneDeep(_.first(groupController.getRndFromSpawnCat(curUnit.troopType, curUnit.coalition, true)));
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
													dbMapServiceController.unitActions('update', serverName, {unitId: pObj.unitId, troopType: null})
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
									} else {
										//try to extract a troop
										proximityController.getTroopsInProximity(serverName, curUnit.lonLatLoc, 0.2, curUnit.coalition)
											.then(function(units){
												var curTroop = _.get(units, [0]);
												if(curTroop) {
													// pickup troop
													dbMapServiceController.unitActions('update', serverName, {unitId: pObj.unitId, troopType: curTroop.spawnCat})
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
																	dbMapServiceController.unitActions('update', serverName, {unitId: eCrate.unitId, dead: true})
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
															} else if (curCrateSpecial === 'repairBase') {
																repairController.repairBase(serverName, curUnit, curCrateType, curCrate);
															} else {
																msg = "G: Unpacking " + _.toUpper(curCrateSpecial) + " " + curCrateType + "!";
																exports.unpackCrate(serverName, curUnit, curCrateType, curCrateSpecial, isCombo, isMobile);
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
														// no troops
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

										}
									}
								})
								.catch(function (err) {
									console.log('line 125: ', err);
								})
							;
						}
						if (pObj.cmd === 'loadCrate') {
							if (!curUnit.virtCrateType) {
								proximityController.getVirtualCratesInProximity(serverName, curUnit.lonLatLoc, 0.4, curUnit.coalition)
									.then(function(units){
										var curCrate = _.find(units, {playerOwnerId: curPlayer.ucid});
										if(curCrate) {
											dbMapServiceController.unitActions('update', serverName, {unitId: pObj.unitId, virtCrateType: curCrate.name})
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
									dbMapServiceController.unitActions('update', serverName, {unitId: pObj.unitId, virtCrateType: null})
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
						if (pObj.cmd === 'EWR') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile);
						}

						if (pObj.cmd === 'JTAC') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, 'jtac', pObj.mobile);
						}

						if (pObj.cmd === 'reloadGroup') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, 'reloadGroup', pObj.mobile);
						}

						if (pObj.cmd === 'repairBase') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, 'repairBase', pObj.mobile);
						}

						if (pObj.cmd === 'unarmedFuel') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile);
						}

						if (pObj.cmd === 'unarmedAmmo') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile);
						}

						if (pObj.cmd === 'armoredCar') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile);
						}

						if (pObj.cmd === 'APC') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile);
						}

						if (pObj.cmd === 'tank') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile);
						}

						if (pObj.cmd === 'artillary') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile);
						}

						if (pObj.cmd === 'mlrs') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile);
						}

						if (pObj.cmd === 'stationaryAntiAir') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile);
						}

						if (pObj.cmd === 'mobileAntiAir') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile);
						}

						if (pObj.cmd === 'samIR') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile);
						}

						if (pObj.cmd === 'mobileSAM') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, false, '', pObj.mobile);
						}

						if (pObj.cmd === 'MRSAM') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, true, '', pObj.mobile);
						}

						if (pObj.cmd === 'LRSAM') {
							exports.spawnCrateFromLogi(serverName, curUnit, pObj.type, pObj.crates, true, '', pObj.mobile);
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
	dbMapServiceController.unitActions('update', serverName, {unitId: unitId, troopType: troopType})
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

_.set(exports, 'spawnCrateFromLogi', function (serverName, unit, type, crates, combo, special, mobile) {
	var crateCount = 0;
	dbMapServiceController.srvPlayerActions('read', serverName, {name: unit.playername})
		.then(function(player) {
			var curPlayer = _.get(player, [0]);
			dbMapServiceController.unitActions('read', serverName, {playerOwnerId: curPlayer.ucid, isCrate: true, dead: false})
				.then(function(delCrates){
					_.forEach(delCrates, function (crate) {
						// console.log('cr: ', crateCount, ' > ', exports.maxCrates-1);
						if(crateCount > exports.maxCrates-2) {
							dbMapServiceController.unitActions('update', serverName, {unitId: crate.unitId, dead: true})
								.catch(function (err) {
									console.log('erroring line387: ', err);
								})
							;
							groupController.destroyUnit(serverName, crate.name);
						}
						crateCount ++;
					});
					if(menuUpdateController.virtualCrates) {
						// console.log('special: ', special);
						var spc;
						var spawnArray;
						if (special) {
							spc = special;
						} else {
							spc = '';
						}
						spawnArray = {
							spwnName: 'CU|' + curPlayer.ucid + '|' + type + '|' + spc + '|' + crates + '|' + combo + '|' + mobile + '|',
							type: "UAZ-469",
							lonLatLoc: unit.lonLatLoc,
							heading: unit.hdg,
							country: unit.country,
							isCrate: true,
							category: "GROUND",
							playerCanDrive: false
						};
						groupController.spawnLogiGroup(serverName, [spawnArray], unit.coalition);
					} else {
						/*
                        crateStatic = {

                        };
                        _crate = {
                            ["category"] = "Cargo",
                            ["shape_name"] = "iso_container_small_cargo",
                            ["type"] = "iso_container_small",
                            ["unitId"] = _unitId,
                            ["y"] = _point.z,
                            ["x"] = _point.x,
                            ["mass"] = _weight,
                            ["name"] = _name,
                            ["canCargo"] = true,
                            ["heading"] = 0
                        }
                        _crate["country"] = _country
                        --env.info("info1: ctry: ".._crate["country"]..'unitId: '.._crate["unitId"]..' name: '.._crate["name"]..' category: '.._crate["category"]..' type: '.._crate["type"]..' mass '.._crate["mass"])
                        mist.dynAddStatic(_crate)
                        */
					}
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
		})
		.catch(function (err) {
			console.log('line 13: ', err);
		})
	;
});

_.set(exports, 'unpackCrate', function (serverName, unit, type, special, combo, mobile) {
	dbMapServiceController.srvPlayerActions('read', serverName, {name: unit.playername})
		.then(function(player) {
			var curPlayer = _.get(player, [0]);
			dbMapServiceController.unitActions('read', serverName, {playerOwnerId: curPlayer.ucid, playerCanDrive: mobile, isCrate: false, dead: false})
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
								dbMapServiceController.unitActions('update', serverName, {unitId: unit.unitId, dead: true})
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
			var spawnArray = [];
			if(menuUpdateController.virtualCrates) {
				// console.log('combo; ', combo);
				if (combo) {
					groupController.getUnitDictionary()
						.then(function (unitDic) {
							var addHdg = 0;
							var curUnitHdg;
							var unitStart;
							var newSpawnArray = [];
							var findUnits = _.filter(unitDic, {comboName: type, enabled: true});
							_.forEach(findUnits, function (cbUnit) {
								if (cbUnit.launcher) {
									for (x=0; x < exports.spawnLauncherCnt; x++) {
										unitStart = _.cloneDeep(cbUnit);
										curUnitHdg = unit.hdg + addHdg;
										if (curUnitHdg > 359) {
											curUnitHdg = 15;
										}
										_.set(unitStart, 'spwnName', 'DU|' + curPlayer.ucid + '|' + cbUnit.type + '||true|' + mobile + '|');
										_.set(unitStart, 'lonLatLoc', unit.lonLatLoc);
										_.set(unitStart, 'heading', curUnitHdg);
										_.set(unitStart, 'country', unit.country);
										_.set(unitStart, 'playerCanDrive', mobile);
										addHdg = addHdg + 15;
										newSpawnArray.push(unitStart);
									}
								} else {
									unitStart = _.cloneDeep(cbUnit);
									curUnitHdg = unit.hdg + addHdg;
									if (curUnitHdg > 359) {
										curUnitHdg = 15;
									}
									_.set(unitStart, 'spwnName', 'DU|' + curPlayer.ucid + '|' + cbUnit.type + '||true|' + mobile + '|');
									_.set(unitStart, 'lonLatLoc', unit.lonLatLoc);
									_.set(unitStart, 'heading', curUnitHdg);
									_.set(unitStart, 'country', unit.country);
									_.set(unitStart, 'playerCanDrive', mobile);
									addHdg = addHdg + 15;
									newSpawnArray.push(unitStart);
								}
							});
							groupController.spawnLogiGroup(serverName, newSpawnArray, unit.coalition);
						})
						.catch(function (err) {
							console.log('line 394: ', err);
						})
					;
				} else {
					if ((type === '1L13 EWR' || type === '55G6 EWR') && unit.country === 'USA') {
						_.set(unit, 'country', 'UKRAINE');
					}
					spawnArray = _.concat(spawnArray, {
						spwnName: 'DU|' + curPlayer.ucid + '|' + type + '|' + special + '|false|' + mobile + '|',
						type: type,
						lonLatLoc: unit.lonLatLoc,
						heading: unit.hdg,
						country: unit.country,
						playerCanDrive: mobile,
						category: "GROUND"
					});
					groupController.spawnLogiGroup(serverName, spawnArray, unit.coalition);
				}
			} else {
				/*
                crateStatic = {

                };
                _crate = {
                    ["category"] = "Cargo",
                    ["shape_name"] = "iso_container_small_cargo",
                    ["type"] = "iso_container_small",
                    ["unitId"] = _unitId,
                    ["y"] = _point.z,
                    ["x"] = _point.x,
                    ["mass"] = _weight,
                    ["name"] = _name,
                    ["canCargo"] = true,
                    ["heading"] = 0
                }
                _crate["country"] = _country
                --env.info("info1: ctry: ".._crate["country"]..'unitId: '.._crate["unitId"]..' name: '.._crate["name"]..' category: '.._crate["category"]..' type: '.._crate["type"]..' mass '.._crate["mass"])
                mist.dynAddStatic(_crate)
                */
			}
		})
		.catch(function (err) {
			console.log('line 390: ', err);
		})
	;
});
