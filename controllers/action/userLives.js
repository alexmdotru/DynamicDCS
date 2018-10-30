const	_ = require('lodash');
const constants = require('../constants');
const masterDBController = require('../db/masterDB');
const DCSLuaCommands = require('../player/DCSLuaCommands');

_.assign(exports, {
	getPlayerBalance: function (serverName) {
		var blueAll;
		var nowTime = new Date().getTime();
		var oneMin = 60 * 1000;
		var redAll;
		var serverAlloc = {};
		return masterDBController.statSessionActions('readLatest', serverName, {})
			.then(function (latestSession) {
				if (latestSession.name) {
					return masterDBController.srvPlayerActions('read', serverName, {sessionName: latestSession.name})
						.then(function (playerArray) {
							_.forEach(playerArray, function (ePlayer) {
								if ((new Date(_.get(ePlayer, 'updatedAt', 0)).getTime() + oneMin > nowTime) && ePlayer.slot !== '') {
									_.set(serverAlloc, [_.get(ePlayer, 'side')], _.get(serverAlloc, [_.get(ePlayer, 'side')], []));
									serverAlloc[_.get(ePlayer, 'side')].push(ePlayer);
								}
							});
							redAll = _.size(_.get(serverAlloc, 1));
							blueAll = _.size(_.get(serverAlloc, 2));
							if(redAll > blueAll && redAll !== 0) {
								return {
									side: 1,
									modifier: (blueAll/redAll),
									players: playerArray
								}
							} else if (redAll < blueAll && blueAll !== 0) {
								return {
									side: 2,
									modifier: (redAll/blueAll),
									players: playerArray
								};
							}
							return {
								side: 0,
								modifier: 1,
								players: playerArray
							};
						})
						.catch(function (err) {
							console.log('line41', err);
						})
					;
				}
			})
			.catch(function (err) {
				console.log('line50', err);
			})
			;
	},
	updateServerLifePoints: function (serverName) {
		var addFracPoint;
		// update life points every 10 mins to start
		console.log('UPDATING LIFE POINTS');
		exports.getPlayerBalance(serverName)
			.then(function(playerBalance) {
				// console.log('pB: ', playerBalance);
				_.forEach(playerBalance.players, function (cPlayer) {
					if (cPlayer) {
						// if (!_.isEmpty(cPlayer.slot)) {
						if (!_.isEmpty(cPlayer.name)) {
							if (cPlayer.side === playerBalance.side) {
								addFracPoint = playerBalance.modifier
							} else {
								addFracPoint = 1;
							}
							masterDBController.unitActions('read', serverName, {dead: false, playername: cPlayer.name})
								.then(function (cUnit) {
									var curUnit = _.get(cUnit, [0]);
									if (curUnit) {
										exports.addLifePoints(
											serverName,
											cPlayer,
											curUnit,
											'PeriodicAdd',
											true,
											addFracPoint
										);
									} else {
										exports.addLifePoints(
											serverName,
											cPlayer,
											null,
											'PeriodicAdd',
											true,
											addFracPoint
										);
									}
								})
								.catch(function (err) {
									console.log('line81', err);
								})
							;
						}
					}
				});
			})
			.catch(function (err) {
				console.log('line100', err);
			})
		;
	},
	lookupLifeResource: function (serverName, playerUcid) {
		masterDBController.srvPlayerActions('read', serverName, {_id: playerUcid})
			.then(function(srvPlayer) {
				var curPlayer = _.get(srvPlayer, [0]);
				if (curPlayer) {
					if (curPlayer.name) {
						masterDBController.unitActions('read', serverName, {playername: curPlayer.name})
							.then(function(cUnit) {
								var curUnit = _.get(cUnit, [0]);
								DCSLuaCommands.sendMesgToGroup(
									curUnit.groupId,
									serverName,
									"G: You Have " + curPlayer.curLifePoints.toFixed(2) + " Life Resource Points.",
									5
								);
							})
							.catch(function (err) {
								console.log('line126', err);
							})
						;
					}
				}
			})
			.catch(function (err) {
				console.log('line133', err);
			})
		;
	},
	lookupAircraftCosts: function (serverName, playerUcid) {
		masterDBController.srvPlayerActions('read', serverName, {_id: playerUcid})
			.then(function(srvPlayer) {
				var curPlayer = _.get(srvPlayer, [0]);
				if (curPlayer) {
					if (curPlayer.name) {
						masterDBController.unitActions('read', serverName, {playername: curPlayer.name})
							.then(function(cUnit) {
								if (cUnit.length > 0) {
									var curUnit = _.get(cUnit, [0]);
									var curUnitDictionary = _.find(_.get(constants, 'unitDictionary'), {_id: _.get(curUnit, 'type')});
									var curUnitLPCost = (curUnitDictionary) ? _.get(curUnitDictionary, 'LPCost') : 1;
									var curTopWeaponCost = 0;
									var curWeaponLookup;
									var foxAllowance;
									var mantraCHK = 0;
									var curTopAmmo = '';
									var totalTakeoffCosts;
									var weaponCost;
									_.forEach(_.get(curUnit, 'ammo', []), function (value) {
										if (_.get(value, 'typeName') === 'MATRA') { mantraCHK += _.get(value, 'count')}
										curWeaponLookup = _.find(_.get(constants, 'weaponsDictionary'), {_id: _.get(value, 'typeName')} );
										foxAllowance = (_.get(value, 'count') > 2) ? 0 : _.get(curWeaponLookup, 'fox2ModUnder2', 0);
										foxAllowance = (mantraCHK > 2) ? 0 : foxAllowance;
										weaponCost = _.get(curWeaponLookup, 'tier', 0) + foxAllowance;
										if (curTopWeaponCost < weaponCost) {
											curTopAmmo = _.last(_.split(_.get(value, 'typeName'), '.'));
											curTopWeaponCost = weaponCost;
										}
									});
									totalTakeoffCosts = curUnitLPCost + curTopWeaponCost;
									DCSLuaCommands.sendMesgToGroup(
										curUnit.groupId,
										serverName,
										"G: You aircraft costs " + totalTakeoffCosts.toFixed(2) + "( " + curUnitLPCost + "(" + _.get(curUnit, 'type') + ")+" + curTopWeaponCost + "(" + curTopAmmo + ") ) Life Points.",
										5
									);
								}
							})
							.catch(function (err) {
								console.log('line126', err);
							})
						;
					}
				}
			})
			.catch(function (err) {
				console.log('line133', err);
			})
		;
	},
	checkAircraftCosts: function (serverName) {
		masterDBController.statSessionActions('readLatest', serverName, {})
			.then(function (latestSession) {
				var mesg;
				if (latestSession.name) {
					masterDBController.srvPlayerActions('read', serverName, {sessionName: latestSession.name, playername: {$ne: ''}})
						.then(function(srvPlayers) {
							_.forEach(srvPlayers, function (curPlayer) {
								if(curPlayer.name) {
									masterDBController.unitActions('read', serverName, {dead: false, playername: curPlayer.name})
										.then(function(cUnit) {
											if (cUnit.length > 0) {
												var curUnit = _.get(cUnit, [0]);
												var curUnitDictionary = _.find(_.get(constants, 'unitDictionary'), {_id: _.get(curUnit, 'type')});
												var curUnitLPCost = (curUnitDictionary) ? _.get(curUnitDictionary, 'LPCost') : 1;
												var curTopWeaponCost = 0;
												var foxAllowance;
												var mantraCHK = 0;
												var totalTakeoffCosts;
												var curWeaponLookup;
												var weaponCost;
												_.forEach(_.get(curUnit, 'ammo', []), function (value) {
													if (_.get(value, 'typeName') === 'MATRA') { mantraCHK += _.get(value, 'count')}
													curWeaponLookup = _.find(_.get(constants, 'weaponsDictionary'), {_id: _.get(value, 'typeName')} );
													foxAllowance = (_.get(value, 'count') > 2) ? 0 : _.get(curWeaponLookup, 'fox2ModUnder2', 0);
													foxAllowance = (mantraCHK > 2) ? 0 : foxAllowance;
													weaponCost = _.get(curWeaponLookup, 'tier', 0) + foxAllowance;
													curTopWeaponCost = (curTopWeaponCost > weaponCost) ? curTopWeaponCost : weaponCost;
												});
												totalTakeoffCosts = curUnitLPCost + curTopWeaponCost;
												if(_.get(curPlayer, 'curLifePoints', 0) < totalTakeoffCosts && !_.get(curUnit, 'inAir', false)) {
													mesg = "G: You Do Not Have Enough Points To Takeoff In " + curUnit.type + " + Loadout(" + totalTakeoffCosts.toFixed(2) + "/" + curPlayer.curLifePoints.toFixed(2) + "}";
													console.log(curPlayer.name + ' ' + mesg);
													DCSLuaCommands.sendMesgToGroup(
														curUnit.groupId,
														serverName,
														mesg,
														30
													);
												}
											}
										})
										.catch(function (err) {
											console.log('line161', err);
										})
									;
								}
							});
						})
						.catch(function (err) {
							console.log('line168', err);
						})
					;
				}
			})
			.catch(function (err) {
				console.log('line180', err);
			})
		;
	},
	addLifePoints: function (serverName, curPlayer, curUnit, execAction, isDirect, addLP) {
		// console.log('addLife: ', serverName, curPlayer, curUnit, execAction, isDirect, addLP);
		masterDBController.srvPlayerActions('addLifePoints', serverName, {
			_id: curPlayer._id,
			addLifePoints: addLP,
			execAction: execAction,
			groupId: _.get(curUnit, 'groupId'),
			storePoints: !isDirect
		});
	},
	removeLifePoints: function (serverName, curPlayer, curUnit, execAction, isDirect, removeLP) {
		var curRemoveLP = removeLP;
		if (!isDirect) {
			var curUnitDictionary = _.find(_.get(constants, 'unitDictionary'), {_id: _.get(curUnit, 'type')});
			var curUnitLPCost = (curUnitDictionary) ? _.get(curUnitDictionary, 'LPCost') : 1;
			var curTopWeaponCost = 0;
			var foxAllowance;
			var mantraCHK = 0;
			var curWeaponLookup;
			var weaponCost;
			_.forEach(_.get(curUnit, 'ammo', []), function (value) {
				if (_.get(value, 'typeName') === 'MATRA') { mantraCHK += _.get(value, 'count')}
				curWeaponLookup = _.find(_.get(constants, 'weaponsDictionary'), {_id: _.get(value, 'typeName')} );
				foxAllowance = (_.get(value, 'count') > 2) ? 0 : _.get(curWeaponLookup, 'fox2ModUnder2', 0);
				foxAllowance = (mantraCHK > 2) ? 0 : foxAllowance;
				weaponCost = _.get(curWeaponLookup, 'tier', 0) + foxAllowance;
				curTopWeaponCost = (curTopWeaponCost > weaponCost) ? curTopWeaponCost : weaponCost;
			});
			curRemoveLP = curUnitLPCost + curTopWeaponCost;
		}
		masterDBController.srvPlayerActions('removeLifePoints', serverName, {
			_id: curPlayer._id,
			execAction: execAction,
			groupId: _.get(curUnit, 'groupId'),
			removeLifePoints: curRemoveLP,
			storePoints: !isDirect
		});
	}
});
