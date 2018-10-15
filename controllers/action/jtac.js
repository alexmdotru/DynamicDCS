const	_ = require('lodash');
const constants = require('../constants');
const dbMapServiceController = require('../db/dbMapService');
const proximityController = require('../proxZone/proximity');

var jtacDistance = 10;
var curLaserCode = 1688;
var redLaserCode = 1686;
var blueLaserCode = 1687;
var fiveMins = 5 * 60 * 1000;

_.set(exports, 'setLaserSmoke', function (serverName, jtUnit, enemyUnit) {
	console.log('Setting Laser: ', jtUnit.name);
	if (jtUnit.coalition === 1) {
		curLaserCode = redLaserCode;
	} else {
		curLaserCode = blueLaserCode;
	}
	//laser & smoke
	var sendClient = {
		"action" : "SETLASERSMOKE",
		"jtacUnitName": jtUnit.name,
		"enemyUnitName": enemyUnit.name,
		"laserCode": curLaserCode,
		"coalition": jtUnit.coalition
	};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line23: ', err);
		})
	;
	dbMapServiceController.unitActions('update', serverName, {_id: jtUnit.name, jtacTarget: enemyUnit.name, jtacReplenTime: new Date().getTime() + fiveMins})
		.catch(function (err) {
			console.log('erroring line28: ', err);
		})
	;
});

_.set(exports, 'removeLaserIR', function (serverName, jtUnit) {
	console.log('Removing Laser: ', jtUnit.name);
	var sendClient = {
		"action" : "REMOVELASERIR",
		"jtacUnitName": jtUnit.name
	};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line23: ', err);
		})
	;
});

_.set(exports, 'jtacNewTarget', function (serverName, jtUnit) {
	var enemySide = (jtUnit.coalition === 1)? 2 : 1;
	// console.log('jts: ', enemySide);
	//check proximity
	proximityController.getEnemyGroundUnitsInProximity(serverName, jtUnit.lonLatLoc, jtacDistance, enemySide)
		.then(function (enemyUnits) {
			//check LOS for proximity
			var enemyUnitNameArray = _.map(enemyUnits, 'name');
			if (enemyUnitNameArray.length > 0) {
				var sendClient = {
					"action" : "ISLOSVISIBLE",
					"jtacUnitName": jtUnit.name,
					"enemyUnitNames": enemyUnitNameArray
				};
				// console.log('enemysNear---: ', sendClient);
				var actionObj = {actionObj: sendClient, queName: 'clientArray'};
				dbMapServiceController.cmdQueActions('save', serverName, actionObj)
					.catch(function (err) {
						console.log('erroring line525: ', err);
					})
				;
			}
		})
		.catch(function (err) {
			console.log('line 118: ', err);
		})
	;
});

_.set(exports, 'aliveJtac30SecCheck', function (serverName) {
	// console.log('jtac check');
	//grab all jtacs
	dbMapServiceController.unitActions('read', serverName, {proxChkGrp: 'jtac', dead: false})
		.then(function (jtacUnits) {
			_.forEach(jtacUnits, function (jtUnit) {
				// console.log('jtac: ', jtUnit);
				//lookup existing unit to see if dead
				if (jtUnit.jtacTarget) {
					dbMapServiceController.unitActions('read', serverName, {name: jtUnit.jtacTarget})
						.then(function (jtacTarget) {
							var curJtacTarget = _.get(jtacTarget, [0]);
							if (curJtacTarget) {
								if (!curJtacTarget.dead){
									if (jtUnit.jtacReplenTime < new Date().getTime()) {
										//replenish laser smoke, reset timer
										exports.setLaserSmoke(serverName, jtUnit, curJtacTarget);
									}
								} else {
									dbMapServiceController.unitActions('updateByName', serverName, {name: jtUnit.name, jtacTarget: null})
										.then(function () {
											exports.removeLaserIR(serverName, jtUnit);
											exports.jtacNewTarget(serverName, jtUnit);
										})
										.catch(function (err) {
											console.log('erroring line101: ', err);
										})
									;
								}
							} else {
								dbMapServiceController.unitActions('updateByName', serverName, {name: jtUnit.name, jtacTarget: null})
									.then(function () {
										exports.removeLaserIR(serverName, jtUnit);
										exports.jtacNewTarget(serverName, jtUnit);
									})
									.catch(function (err) {
										console.log('erroring line101: ', err);
									})
								;
							}
						})
						.catch(function (err) {
							console.log('line 21: ', err);
						})
					;
				} else {
					exports.jtacNewTarget(serverName, jtUnit);
				}
			});
		})
		.catch(function (err) {
			console.log('line 118: ', err);
		})
	;
});

_.set(exports, 'processLOSEnemy', function (serverName, losReply) {
	// console.log('PLE: ', serverName, losReply);
	if (losReply.data.length) {
		var enemyUnit;
		var unitPThrArray = [];
		//get jtac unit
		dbMapServiceController.unitActions('read', serverName, {name: losReply.jtacUnitName})
			.then(function (fJtacUnit) {
				var curJtacUnit = _.get(fJtacUnit, [0]);
				dbMapServiceController.unitActions('read', serverName, {name: {$in: losReply.data}})
					.then(function (eJtacUnit) {
						_.forEach(eJtacUnit, function (jtUnit) {
							var curUnitDict = _.find(_.get(constants, 'unitDictionary'), {_id: jtUnit.type});
							if (curUnitDict) {
								_.set(jtUnit, 'threatLvl', curUnitDict.threatLvl);
								unitPThrArray.push(jtUnit)
							} else {
								console.log('cant findUnit: ', curUnitDict, jtUnit.type);
							}
						});
						enemyUnit = _.first(_.orderBy(unitPThrArray, 'threatLvl', 'desc'));
						//laser & smoke
						// console.log('lasersmoke: ', serverName, curJtacUnit, enemyUnit);
						exports.setLaserSmoke(serverName, curJtacUnit, enemyUnit);
					})
					.catch(function (err) {
						console.log('line 117: ', err);
					})
				;
			})
			.catch(function (err) {
					console.log('line 122: ', err);
			})
		;
	} else {
		// console.log('jtac not finding anything');
	}
});
