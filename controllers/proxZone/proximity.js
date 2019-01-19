const	_ = require('lodash');
const masterDBController = require('../db/masterDB');
const groupController = require('../spawn/group');
const menuUpdateController = require('../menu/menuUpdate');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const baseSpawnFlagsController = require('../action/baseSpawnFlags');

var unitsInProxLogiTowers = {};
var unitsInProxBases = {};

_.assign(exports, {
	checkUnitsToBaseForCapture: function (serverName) {
		var sideArray = {};
		masterDBController.baseActions('read', serverName, {mainBase: true})
			.then(function (bases) {
				_.forEach(bases, function (base) {
					exports.getGroundUnitsInProximity(serverName, base.centerLoc, 3, true)
						.then(function (unitsInRange) {
							var spawnArray = [];
							sideArray = _.transform(unitsInRange, function (result, value) {
								(result[value.coalition] || (result[value.coalition] = [])).push(value);
							}, {});
							if (base.side === 1 && _.get(sideArray, [2], []).length > 0) {
								// console.log('enemy in range: ', base.name + ': enemy Blue');
								if (_.get(sideArray, [1], []).length === 0) {
									console.log('BASE HAS BEEN CAPTURED: ', base.name, ' is now ', 2);
									var msg = base.name + " HAS BEEN CAPTURED BY BLUE";
									DCSLuaCommands.sendMesgToAll(
										serverName,
										msg,
										60
									);
									// console.log('Spawning Support Units', base, 2);
									spawnArray = _.concat(spawnArray, groupController.spawnSupportBaseGrp(serverName, base.name, 2, false));
									groupController.spawnGroup(serverName, spawnArray, base.name, 2);
									masterDBController.baseActions('updateSide', serverName, {name: base.name, side: 2})
										.then(function () {
											baseSpawnFlagsController.setbaseSides(serverName);
										})
										.catch(function (err) {
											console.log('erroring line162: ', err);
										})
									;
									masterDBController.unitActions('read', serverName, {name: base.name + ' Logistics', dead: false})
										.then(function (aliveLogistics) {
											if (aliveLogistics.length > 0) {
												groupController.spawnLogisticCmdCenter(serverName, {}, false, base, 2);
											}
										})
										.catch(function (err) {
											console.log('erroring line189: ', err);
										})
									;
									masterDBController.unitActions('read', serverName, {name: base.name + ' Communications', dead: false})
										.then(function (aliveComms) {
											if (aliveComms.length > 0) {
												groupController.spawnRadioTower(serverName, {}, false, base, 2);
											}
										})
										.catch(function (err) {
											console.log('erroring line189: ', err);
										})
									;
									masterDBController.unitActions('read', serverName, {name: base.name + ' 55G6 EWR', dead: false})
										.then(function (commUnit) {
											if (commUnit === 0) {
												groupController.spawnBaseEWR(serverName, '55G6 EWR',  base.name, 1);
											}
										})
										.catch(function (err) {
											console.log('erroring line662: ', err);
										})
									;
									masterDBController.unitActions('read', serverName, {name: base.name + ' 1L13 EWR', dead: false})
										.then(function (commUnit) {
											if (commUnit === 0) {
												groupController.spawnBaseEWR(serverName, '1L13 EWR',  base.name, 1);
											}
										})
										.catch(function (err) {
											console.log('erroring line662: ', err);
										})
									;
								}
							}
							if (base.side === 2 && _.get(sideArray, [1], []).length > 0) {
								// console.log('enemy in range: ', base.name + ': enemy Red');
								if (_.get(sideArray, [2], []).length === 0) {
									console.log('BASE HAS BEEN CAPTURED: ', base.name, ' is now ', 1);
									var msg = base.name + " HAS BEEN CAPTURED BY RED";
									DCSLuaCommands.sendMesgToAll(
										serverName,
										msg,
										60
									);
									// console.log('Spawning Support Units', base, 1);
									spawnArray = _.concat(spawnArray, groupController.spawnSupportBaseGrp(serverName, base.name, 1, false));
									groupController.spawnGroup(serverName, spawnArray, base.name, 1);
									masterDBController.baseActions('updateSide', serverName, {name: base.name, side: 1})
										.then(function () {
											baseSpawnFlagsController.setbaseSides(serverName);
										})
										.catch(function (err) {
											console.log('erroring line189: ', err);
										})
									;
									masterDBController.unitActions('read', serverName, {name: base.name + ' Logistics', dead: false})
										.then(function (aliveLogistics) {
											if (aliveLogistics.length > 0) {
												groupController.spawnLogisticCmdCenter(serverName, {}, false, base, 1);
											}
										})
										.catch(function (err) {
											console.log('erroring line189: ', err);
										})
									;
									masterDBController.unitActions('read', serverName, {name: base.name + ' Communications', dead: false})
										.then(function (aliveComms) {
											if (aliveComms.length > 0) {
												groupController.spawnRadioTower(serverName, {}, false, base, 1);
											}
										})
										.catch(function (err) {
											console.log('erroring line189: ', err);
										})
									;
									masterDBController.unitActions('read', serverName, {name: base.name + ' 1L13 EWR', dead: false})
										.then(function (commUnit) {
											if (commUnit === 0) {
												groupController.spawnBaseEWR(serverName, '1L13 EWR',  base.name, 2);
											}
										})
										.catch(function (err) {
											console.log('erroring line662: ', err);
										})
									;
								}
							}
							if (base.side === 0) {
								var firstUnit = _.first(unitsInRange);
								var unitSide = _.get(firstUnit, 'coalition');
								// console.log('enemy in range: ', base.name + ': enemy Red');
								if (_.get(sideArray, [2], []).length === 0) {
									console.log('BASE HAS BEEN CAPTURED: ', base.name, ' is now ', unitSide);
									var msg = base.name + " HAS BEEN CAPTURED";
									DCSLuaCommands.sendMesgToAll(
										serverName,
										msg,
										60
									);
									// console.log('Spawning Support Units', base, unitSide);
									spawnArray = _.concat(spawnArray, groupController.spawnSupportBaseGrp(serverName, base.name, unitSide, false));
									groupController.spawnGroup(serverName, spawnArray, base.name, unitSide);
									masterDBController.baseActions('updateSide', serverName, {name: base.name, side: unitSide})
										.then(function () {
											baseSpawnFlagsController.setbaseSides(serverName);
										})
										.catch(function (err) {
											console.log('erroring line189: ', err);
										})
									;
									masterDBController.unitActions('read', serverName, {name: base.name + ' Logistics', dead: false})
										.then(function (aliveLogistics) {
											if (aliveLogistics.length > 0) {
												groupController.spawnLogisticCmdCenter(serverName, {}, false, base, unitSide);
											}
										})
										.catch(function (err) {
											console.log('erroring line189: ', err);
										})
									;
									masterDBController.unitActions('read', serverName, {name: base.name + ' Communications', dead: false})
										.then(function (aliveComms) {
											if (aliveComms.length > 0) {
												groupController.spawnRadioTower(serverName, {}, false, base, unitSide);
											}
										})
										.catch(function (err) {
											console.log('erroring line189: ', err);
										})
									;
									if (unitSide === 2) {
										masterDBController.unitActions('read', serverName, {name:  base.name + ' 1L13 EWR', dead: false})
											.then(function (commUnit) {
												if (commUnit === 0) {
													groupController.spawnBaseEWR(serverName, '1L13 EWR',  base.name, unitSide);
												}
											})
											.catch(function (err) {
												console.log('erroring line662: ', err);
											})
										;
									} else {
										masterDBController.unitActions('read', serverName, {name:  base.name + ' 55G6 EWR', dead: false})
											.then(function (commUnit) {
												if (commUnit === 0) {
													groupController.spawnBaseEWR(serverName, '55G6 EWR',  base.name, unitSide);
												}
											})
											.catch(function (err) {
												console.log('erroring line662: ', err);
											})
										;
										masterDBController.unitActions('read', serverName, {name:  base.name + ' 1L13 EWR', dead: false})
											.then(function (commUnit) {
												if (commUnit === 0) {
													groupController.spawnBaseEWR(serverName, '1L13 EWR',  base.name, unitSide);
												}
											})
											.catch(function (err) {
												console.log('erroring line662: ', err);
											})
										;
									}
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
				console.log('line 118: ', err);
			})
		;
	},
	checkUnitsToBaseForTroops: function (serverName) {
		// check every base that is owned by red or blue, 20 km sphere
		masterDBController.baseActions('read', serverName, {mainBase: true})
			.then(function (bases) {
				_.forEach(bases, function (base) {
					var curBaseName = base.name;
					_.set(unitsInProxBases, [serverName, curBaseName], _.get(unitsInProxBases, [serverName, curBaseName], {}));
					exports.getPlayersInProximity(serverName, _.get(base, 'centerLoc'), 3.4, false, base.side)
						.then(function (unitsInProx) {
							_.forEach(_.get(unitsInProxBases, [serverName, curBaseName], {}), function (unit, key) {
								var cId = _.toNumber(key);
								if(!_.find(unitsInProx, {unitId: cId}) && unit.enabled) {
									_.set(unit, 'enabled', false);
									// console.log('resetMenuProxUnits: ', curBaseName, cId);
									//remove logi f10 menu
									menuUpdateController.logisticsMenu('resetMenu', serverName, unit.data);
								}
							});
							_.forEach(unitsInProx, function(unit) {
								var cId = unit.unitId;
								if(cId && curBaseName) {
									if(!_.get(unitsInProxBases, [serverName, curBaseName, cId, 'enabled'])) {
										_.set(unitsInProxBases, [serverName, curBaseName, cId], {
											enabled: true,
											data: unit
										});
										// console.log('A baseTroops: ', curBaseName, cId);
										//update f10 radio menu
										// console.log('addTroopsMenu: ', curBaseName, cId);
										menuUpdateController.logisticsMenu('addTroopsMenu', serverName, unit);
									}
								}
							});
						})
						.catch(function (err) {
							console.log('line 64: ', err);
						})
					;
				});
			})
			.catch(function (err) {
				console.log('line 35: ', err);
			})
		;
	},
	checkUnitsToLogisticTowers: function (serverName) {
		masterDBController.unitActions('read', serverName, {proxChkGrp: 'logisticTowers', dead: false})
			.then(function (logiUnits) {
				_.forEach(logiUnits, function (logiUnit) {
					var curLogiName = logiUnit.name;
					_.set(unitsInProxLogiTowers, [serverName, curLogiName], _.get(unitsInProxLogiTowers, [serverName, curLogiName], {}));
					exports.getPlayersInProximity(serverName, _.get(logiUnit, 'lonLatLoc'), 0.2, false, logiUnit.coalition)
						.then(function (unitsInProx) {
							_.forEach(_.get(unitsInProxLogiTowers, [serverName, curLogiName], {}), function (unit, key) {
								var cId = _.toNumber(key);
								if(!_.find(unitsInProx, {unitId: cId}) && unit.enabled) {
									_.set(unit, 'enabled', false);
									// console.log('R logiTower: ', curLogiName, cId);
									//remove logi f10 menu
									menuUpdateController.logisticsMenu('resetMenu', serverName, unit.data );
								}
							});
							_.forEach(unitsInProx, function(unit) {
								var cId = unit.unitId;
								if(cId && curLogiName) {
									if(!_.get(unitsInProxLogiTowers, [serverName, curLogiName, cId, 'enabled'])) {
										_.set(unitsInProxLogiTowers, [serverName, curLogiName, cId], {
											enabled: true,
											data: unit
										});
										// console.log('A logiTower: ', curLogiName, cId);
										//update f10 radio menu
										menuUpdateController.logisticsMenu('addLogiCratesMenu', serverName, unit);
									}
								}
							});
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
	},
	extractUnitsBackToBase: function (unit, serverName) {
		var friendlyBase = false;
		_.forEach(_.get(unitsInProxBases, [serverName], []), function (base, baseName) {
			if(_.get(base, [unit.unitId, 'enabled'])) {
				friendlyBase = baseName;
			}
		});
		return friendlyBase;
	},
	getCoalitionGroundUnitsInProximity: function (serverName, lonLat, kmDistance, side) {
		return masterDBController.unitActions(
			'read',
			serverName,
			{
				dead: false,
				lonLatLoc: {
					$geoWithin: {
						$centerSphere: [
							lonLat,
							kmDistance / 6378.1
						]
					}
				},
				category: 'GROUND',
				coalition: side
			})
			.then(function (closeUnits) {
				// console.log('close units ' + closeUnits);
				return closeUnits;
			})
			.catch(function (err) {
				console.log('line 54: ', err);
			})
			;
	},
	getBasesInProximity: function (serverName, lonLat, kmDistance, side) {
		return masterDBController.baseActions(
			'read',
			serverName,
			{
				centerLoc: {
					$near: {
						$geometry: {
							type: "Point",
							coordinates: lonLat
						},
						$maxDistance: kmDistance * 1000
					}
				},
				side: side,
				mainBase: true
			})
			.then(function (closestBase) {
				// console.log('close units ' + closeUnits);
				return closestBase;
			})
			.catch(function (err) {
				console.log('line 27: ', err);
			})
			;
	},
	getGroundUnitsInProximity: function (serverName, lonLat, kmDistance, isTroop) {
		var troopQuery = {
			dead: false,
			lonLatLoc: {
				$near: {
					$geometry: {
						type: "Point",
						coordinates: lonLat
					},
					$maxDistance: kmDistance * 1000
				}
			},
			category: 'GROUND',
			isCrate: false
		};
		if (!isTroop) {
			_.set(troopQuery, 'isTroop', false);
		}
		return masterDBController.unitActions('readStd', serverName, troopQuery)
			.then(function (closeUnits) {
				// console.log('close units ' + closeUnits);
				return closeUnits;
			})
			.catch(function (err) {
				console.log('line 81: ', err);
			})
			;
	},
	getLogiTowersProximity: function (serverName, lonLat, kmDistance, coalition) {
		return masterDBController.unitActions(
			'read',
			serverName,
			{
				dead: false,
				lonLatLoc: {
					$geoWithin: {
						$centerSphere: [
							lonLat,
							kmDistance / 6378.1
						]
					}
				},
				category: 'STRUCTURE',
				proxChkGrp: 'logisticTowers',
				coalition: coalition
			})
			.then(function (closeUnits) {
				// console.log('close units ' + closeUnits);
				return closeUnits;
			})
			.catch(function (err) {
				console.log('line 27: ', err);
			})
			;
	},
	getPlayersInProximity: function (serverName, lonLat, kmDistance, inAir, coalition) {
		return masterDBController.unitActions(
			'read',
			serverName,
			{
				dead: false,
				lonLatLoc: {
					$geoWithin: {
						$centerSphere: [
							lonLat,
							kmDistance / 6378.1
						]
					}
				},
				playername: {
					$ne: ''
				},
				category: {
					$in: ['AIRPLANE', 'HELICOPTER']
				},
				inAir: inAir,
				coalition: coalition
			})
			.then(function (closeUnits) {
				// console.log('close units ' + closeUnits);
				return closeUnits;
			})
			.catch(function (err) {
				console.log('line 121: ', err);
			})
			;
	},
	getStaticCratesInProximity: function (serverName, lonLat, kmDistance, coalition) {
		return masterDBController.staticCrateActions(
			'readStd',
			serverName,
			{
				lonLatLoc: {
					$near: {
						$geometry: {
							type: "Point",
							coordinates: lonLat
						},
						$maxDistance: kmDistance * 1000
					}
				},
				coalition: coalition
			})
			.then(function (closeUnits) {
				// console.log('close units ' + closeUnits);
				return closeUnits;
			})
			.catch(function (err) {
				console.log('line 140: ', err);
			})
			;
	},
	getTroopsInProximity: function (serverName, lonLat, kmDistance, coalition) {
		return masterDBController.unitActions(
			'readStd',
			serverName,
			{
				dead: false,
				lonLatLoc: {
					$near: {
						$geometry: {
							type: "Point",
							coordinates: lonLat
						},
						$maxDistance: kmDistance * 1000
					}
				},
				playername: {
					$eq: ''
				},
				type: {
					$in: [
						'Soldier M249',
						'Infantry AK',
						'Stinger manpad',
						'Soldier M4',
						'Paratrooper RPG-16',
						'2B11 mortar',
						'SA-18 Igla manpad'
					]
				},
				coalition: coalition
			})
			.then(function (closeUnits) {
				// console.log('close units ' + closeUnits);
				return closeUnits;
			})
			.catch(function (err) {
				console.log('line 176: ', err);
			})
			;
	},
	getVirtualCratesInProximity: function (serverName, lonLat, kmDistance, coalition) {
		return masterDBController.unitActions(
			'readStd',
			serverName,
			{
				dead: false,
				lonLatLoc: {
					$near: {
						$geometry: {
							type: "Point",
							coordinates: lonLat
						},
						$maxDistance: kmDistance * 1000
					}
				},
				name : {
					$regex: /CU\|/
				},
				inAir: false,
				coalition: coalition
			})
			.then(function (closeUnits) {
				// console.log('close units ' + closeUnits);
				return closeUnits;
			})
			.catch(function (err) {
				console.log('line 140: ', err);
			})
			;
	},
	isPlayerInProximity: function (serverName, lonLat, kmDistance, playerName) {
		return masterDBController.unitActions(
			'read',
			serverName,
			{
				dead: false,
				lonLatLoc: {
					$geoWithin: {
						$centerSphere: [
							lonLat,
							kmDistance / 6378.1
						]
					}
				},
				playername: playerName
			})
			.then(function (closeUnits) {
				if(closeUnits.length > 0) {
					return true;
				}
				return false;
			})
			.catch(function (err) {
				console.log('line 149: ', err);
			})
			;
	},
	unitInProxLogiTowers: function (unit, serverName) {
		var friendlyLogi = false;
		_.forEach(_.get(unitsInProxLogiTowers, [serverName], []), function (logiTower, logiName) {
			if(_.get(logiTower, [unit.unitId, 'enabled'])) {
				friendlyLogi = logiName;
			}
		});
		return friendlyLogi;
	}
});
