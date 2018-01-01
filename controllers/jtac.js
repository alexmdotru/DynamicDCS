const	_ = require('lodash');
const dbSystemServiceController = require('./dbSystemService');
const dbMapServiceController = require('./dbMapService');
const proximityController = require('./proximity');
const groupController = require('./group');

var jtacDistance = 10000;
var laserCode = 1113;

_.set(exports, 'setLaserSmoke', function (servername, jtUnit, enemyUnit) {
	//laser & smoke
	var sendClient = {
		"action" : "SETLASERSMOKE",
		"jtacUnitName": jtUnit.name,
		"enemyUnitName": enemyUnit.name,
		"laserCode": laserCode,
		"coalition": jtUnit.coalition
	};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line525: ', err);
		})
	;
});

_.set(exports, 'jtacNewTarget', function (jtUnit) {
	var enemySide = (jtUnit === 1)? 2 : 1;
	//check proximity
	proximityController.getEnemyGroundUnitsInProximity(serverName, jtUnit.lonLatLoc, jtacDistance, enemySide)
		.then(function (enemyUnits) {
			//check LOS for proximity
			var enemyUnitNameArray = _.map(enemyUnits, 'name');
			var sendClient = {
				"action" : "ISLOSVISIBLE",
				"jtacUnitName": jtUnit.name,
				"enemyUnitNames": enemyUnitNameArray
			};
			var actionObj = {actionObj: sendClient, queName: 'clientArray'};
			dbMapServiceController.cmdQueActions('save', serverName, actionObj)
				.catch(function (err) {
					console.log('erroring line525: ', err);
				})
			;
		})
		.catch(function (err) {
			console.log('line 118: ', err);
		})
	;
});

_.set(exports, 'aliveJtac30SecCheck', function (serverName) {
	console.log('jtac check');
	//grab all jtacs
	dbMapServiceController.baseActions('read', serverName, {proxChkGrp: 'jtac'})
		.then(function (jtacUnits) {
			_.forEach(jtacUnits, function (jtUnit) {
				//lookup existing unit to see if dead
				if (jtUnit.jtacTarget) {
					dbMapServiceController.unitActions('read', serverName, {name: jtUnit.jtacTarget})
						.then(function (jtacTarget) {
							var curJtacTarget = _.get(jtacTarget, [0]);
							if (!curJtacTarget.dead){
								if (jtUnit.jtacReplenTime < new Date().getTime()) {
									//replenish laser smoke, reset timer
									exports.setLaserSmoke(serverName, jtUnit, curJtacTarget);
								}
							} else {
								exports.jtacNewTarget(jtUnit);
							}
						})
						.catch(function (err) {
							console.log('line 21: ', err);
						})
					;
				} else {
					exports.jtacNewTarget(jtUnit);
				}
			});
		})
		.catch(function (err) {
			console.log('line 118: ', err);
		})
	;
});

_.set(exports, 'processLOSEnemy', function (serverName, losReply) {
	if (losReply.data.length) {
		var enemyUnit;
		var unitPThrArray = [];
		//get jtac unit
		dbMapServiceController.unitActions('read', serverName, {name: losReply.jtacUnitName})
			.then(function (fJtacUnit) {
				var curJtacUnit = _.get(fJtacUnit, [0]);
				dbMapServiceController.unitActions('read', serverName, {name: {$in: losReply.data}})
					.then(function (eJtacUnit) {
						dbSystemServiceController.unitDictionaryActions('read', {})
							.then(function (unitDict) {
								_.forEach(eJtacUnit, function (jtUnit) {
									var curUnitDict = _.find(unitDict, {_id: jtUnit.type});
									_.set(jtUnit, 'threatLvl', curUnitDict.threatLvl);
									unitPThrArray.push(jtUnit)
								});
								enemyUnit = _.first(_.orderBy(unitPThrArray, 'threatLvl', 'desc'));
								//laser & smoke
								exports.setLaserSmoke(serverName, curJtacUnit, enemyUnit);
							})
							.catch(function (err) {
								console.log('line 59: ', err);
							})
						;
					})
					.catch(function (err) {
						console.log('line 59: ', err);
					})
				;
			})
			.catch(function (err) {
					console.log('line 65: ', err);
			})
		;
	} else {
		console.log('jtac not finding anything');
	}
});
