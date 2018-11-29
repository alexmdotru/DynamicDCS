const	_ = require('lodash');
const masterDBController = require('../db/masterDB');
const proximityController = require('../proxZone/proximity');
const groupController = require('../spawn/group');
const reloadController = require('../menu/reload');
const repairController = require('../menu/repair');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const menuCmdsController = require('../menu/menuCmds');
const neutralCCController = require('../action/neutralCC');

_.assign(exports, {
	destroyCrates: function (serverName, grpTypes, curCrateType, numCrate) {
		var cCnt = 1;
		_.forEach(_.get(grpTypes, [curCrateType]), function (eCrate) {
			if ( cCnt <= numCrate) {
				console.log('delCrate: ',  eCrate._id);
				masterDBController.staticCrateActions('delete', serverName, {_id: eCrate._id})
					.catch(function (err) {
						console.log('erroring line59: ', err);
					})
				;
				groupController.destroyUnit(serverName, eCrate.name);
				cCnt ++;
			}
		});
	},
	processStaticCrate: function (serverName, crateObj) {
		var cPromise = [];
		_.forEach(_.get(crateObj, 'data', {}), function (crate, name) {
			if(crate.alive) {
				// console.log('ACHK: ', name);
				cPromise.push(masterDBController.staticCrateActions('update', serverName, {_id: name, lonLatLoc: [crate.lon, crate.lat]})
					.catch(function (err) {
						console.log('line 17: ', err);
					})
				);
			} else {
				// console.log('DCHK: ', name);
				cPromise.push(masterDBController.staticCrateActions('delete', serverName, {_id: name})
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
	},
	unpackCrate: function (serverName, crateObj) { //crateObj is every alive crate on the server
		masterDBController.unitActions('read', serverName, {unitId: crateObj.unitId})
			.then(function(pUnit) {
				var curPlayerUnit = _.get(pUnit, 0);
				proximityController.getStaticCratesInProximity(serverName, curPlayerUnit.lonLatLoc, 0.2, curPlayerUnit.coalition)
					.then(function(crates){
						var cCnt = 0;
						var grpTypes;
						var localCrateNum;
						var msg;
						var curCrate = _.get(crates, [0], {});
						var numCrate = curCrate.crateAmt;
						var curCrateSpecial = _.get(curCrate, 'special', '');
						var curCrateType = curCrate.templateName;
						var isCombo = curCrate.isCombo;
						var isMobile = curCrate.playerCanDrive;
						// console.log('cratesInProx: ', serverName, curPlayerUnit.lonLatLoc, 0.2, curPlayerUnit.coalition, crates);
						if(curCrate) {
							grpTypes = _.transform(crates, function (result, value) {
								(result[value.templateName] || (result[value.templateName] = [])).push(value);
							}, {});

							localCrateNum = _.get(grpTypes, [curCrateType], []).length;
							// console.log('unpackingCrate: ', curCrate, localCrateNum, grpTypes);

							if( localCrateNum >=  numCrate) {
								if (curCrateSpecial === 'reloadGroup') {
									// console.log('reloadGroup: ', serverName, curPlayerUnit, curCrate);
									reloadController.reloadSAM(serverName, curPlayerUnit, curCrate)
										.then(function (response) {
											// console.log('reload resp: ', response);
											if (response) {
												exports.destroyCrates(serverName, grpTypes, curCrateType, numCrate);
											}
										})
										.catch(function (err) {
											console.log('line 32: ', err);
										})
									;
								} else if (_.includes(curCrateSpecial, 'CCBuild|')) {
									console.log('trying to build cc on empty base');
									neutralCCController.spawnCCAtNeutralBase(serverName, curPlayerUnit)
										.then(function (response) {
											console.log('spawn response: ', response);
											if (response) {
												exports.destroyCrates(serverName, grpTypes, curCrateType, numCrate);
											}
										})
										.catch(function (err) {
											console.log('line 32: ', err);
										})
									;
								} else {
									msg = "G: Unpacking " + _.toUpper(curCrateSpecial) + " " + curCrateType + "!";
									menuCmdsController.unpackCrate(serverName, curPlayerUnit, curCrate.country, curCrateType, curCrateSpecial, isCombo, isMobile)
										.then(function (response) {
											console.log('unpacking response: ', response);
											if (response) {
												exports.destroyCrates(serverName, grpTypes, curCrateType, numCrate);
											}
										})
										.catch(function (err) {
											console.log('line 32: ', err);
										})
									;
									// console.log('singleCrateDestroy: ', curCrate.name);
									// groupController.destroyUnit(serverName, curCrate.name);
									DCSLuaCommands.sendMesgToGroup(
										curPlayerUnit.groupId,
										serverName,
										msg,
										5
									);
								}

							} else {
								if (localCrateNum) {
									DCSLuaCommands.sendMesgToGroup(
										curPlayerUnit.groupId,
										serverName,
										"G: Not Enough Crates for " + curCrateType + "!(" + localCrateNum + '/' + numCrate + ")",
										5
									);
								} else {
									DCSLuaCommands.sendMesgToGroup(
										curPlayerUnit.groupId,
										serverName,
										"G: No Crates In Area!",
										5
									);
								}
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
	}
});
