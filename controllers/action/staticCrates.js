const	_ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const proximityController = require('../proxZone/proximity');
const crateController = require('../spawn/crate');
const groupController = require('../../controllers/spawn/group');

_.set(exports, 'processStaticCrate', function (serverName, crateObj) {
	var cPromise = [];
	console.log('CO: ', crateObj);
	_.forEach(_.get(crateObj, 'data', {}), function (crate, name) {
		if(crate.alive) {
			cPromise.push(dbMapServiceController.staticCrateActions('update', serverName, {id: name, lonLatLoc: [crate.lon, crate.lat]}));
		} else {
			cPromise.push(dbMapServiceController.staticCrateActions('delete', serverName, {id: name}));
		}
	});
	Promise.all(cPromise)
		.then(function () {
			if(crateObj.callback === 'unpackCrate') {
				exports.unpackCrate(crateObj);
			}
		})
		.catch(function (err) {
			console.log('erroring line35: ', err);
		})
	;
});

_.set(exports, 'unpackCrate', function (crateObj) {
	proximityController.getStaticCratesInProximity(serverName, curUnit.lonLatLoc, 0.4, curUnit.coalition)
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
					(result[_.get(_.split(value.name, '|'), [2])] || (result[_.get(_.split(value.name, '|'), [2])] = [])).push(value);
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
});
