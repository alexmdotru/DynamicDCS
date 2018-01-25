const	_ = require('lodash'),
		js2lua = require('js2lua');

const dbMapServiceController = require('./db/dbMapService');
const dbSystemServiceController = require('./db/dbSystemService');
const zoneController = require('./proxZone/zone');

// from my main mission object, can spawn units on both sides in this setup
var countryId = [
	'RUSSIA',
	'UKRAINE',
	'USA',
	'TURKEY',
	'UK',
	'FRANCE',
	'GERMANY',
	'AGGRESSORS',
	'CANADA',
	'SPAIN',
	'THE_NETHERLANDS',
	'BELGIUM',
	'NORWAY',
	'DENMARK',
	'ISRAEL',
	'GEORGIA',
	'INSURGENTS',
	'ABKHAZIA',
	'SOUTH_OSETIA',
	'ITALY',
	'AUSTRALIA',
	'SWITZERLAND',
	'AUSTRIA',
	'BELARUS',
	'BULGARIA',
	'CHEZH_REPUBLIC',
	'CHINA',
	'CROATIA',
	'EGYPT',
	'FINLAND',
	'GREECE',
	'HUNGARY',
	'INDIA',
	'IRAN',
	'IRAQ',
	'JAPAN',
	'KAZAKHSTAN',
	'NORTH_KOREA',
	'PAKISTAN',
	'POLAND',
	'ROMANIA',
	'SAUDI_ARABIA',
	'SERBIA',
	'SLOVAKIA',
	'SOUTH_KOREA',
	'SWEDEN',
	'SYRIA',
	'YEMEN',
	'VIETNAM',
	'VENEZUELA',
	'TUNISIA',
	'THAILAND',
	'SUDAN',
	'PHILIPPINES',
	'MOROCCO',
	'MEXICO',
	'MALAYSIA',
	'LIBYA',
	'JORDAN',
	'INDONESIA',
	'HONDURAS',
	'ETHIOPIA',
	'CHILE',
	'BRAZIL',
	'BAHRAIN',
	'THIRDREICH',
	'YUGOSLAVIA',
	'USSR',
	'ITALIAN_SOCIAL_REPUBLIC'
];

var countryCoObj = {
	defCountrys: {
		1: 'RUSSIA',
		2: 'USA'
	},
	side: {
		0: 'neutral',
		1: 'red',
		2: 'blue'
	},
	red: [
		'ABKHAZIA',
		'BELARUS',
		'CHINA',
		'EGYPT',
		'FINLAND',
		'HUNGARY',
		'INSURGENTS',
		'IRAN',
		'FRANCE',
		'ISRAEL',
		'JAPAN',
		'NORTH_KOREA',
		'PAKISTAN',
		'ROMANIA',
		'RUSSIA',
		'SAUDI_ARABIA',
		'SERBIA',
		'SLOVAKIA',
		'SOUTH_OSETIA',
		'SYRIA'
	],
	blue: [
		'AUSTRALIA',
		'AUSTRIA',
		'BELGIUM',
		'BULGARIA',
		'CANADA',
		'CROATIA',
		'CHEZH_REPUBLI',
		'DENMARK',
		'IRAQ',
		'GEORGIA',
		'GERMANY',
		'GREECE',
		'INDIA',
		'ITALY',
		'NORWAY',
		'POLAND',
		'SOUTH_KOREA',
		'SPAIN',
		'SWEDEN',
		'SWITZERLAND',
		'THE_NETHERLANDS',
		'SWITZERLAND',
		'UK',
		'USA',
		'AGGRESSORS',
		'KAZAKHSTAN',
		'UKRAINE'
	]
};

_.set(exports, 'spawnGrp', function (grpSpawn, country, category) {
	return gSpawnCmd = 'coalition.addGroup(' + _.indexOf(countryId, country) + ', Group.Category.' + category + ', ' + grpSpawn + ')';
});

_.set(exports, 'spawnStatic', function (serverName, staticSpawn, country, statName, init) {
	if (init) {
		return sSpawnCmd = [
			'coalition.addStaticObject(' + _.indexOf(countryId, country) + ', ' + staticSpawn + ')'
		];
	} else {
		exports.destroyUnit( serverName, statName );
		return sSpawnCmd = [
			'coalition.addStaticObject(' + _.indexOf(countryId, country) + ', ' + staticSpawn + ')'
		];
	}
});

_.set(exports, 'landPlaneRouteTemplate', function (routes) {
	return '' +
		'["route"] = {' +
			'["points"] = {' +
				'[1] = {' +
					'["alt"] = 2000,' +
					'["action"] = "Turning Point",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = 138,' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {' +
							'["tasks"] = {' +
								'[1] = {' +
									'["enabled"]=true,' +
									'["auto"]=false,' +
									'["id"]="WrappedAction",' +
									'["number"] = 1,' +
									'["params"]={' +
										'["action"]={' +
											'["id"] = "Option",' +
											'["params"] = {' +
												'["value"] = 2,' +
												'["name"] = 1,' +
											'},' +
										'},' +
									'},' +
								'},' +
							'},' +
						'},' +
					'},' +
					'["type"] = "Turning Point",' +
					//'["ETA"] = 0,' +
					//'["ETA_locked"] = true,' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 0, 1]) + ', ' + _.get(routes, ['routeLocs', 0, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 0, 1]) + ', ' + _.get(routes, ['routeLocs', 0, 0]) + ').z, ' +
					//'["name"] = "waypoint 1",' +
					//'["formation_template"] = "",' +
					//'["speed_locked"] = true,' +
				'},' +
				'[2]={' +
					'["alt"] = 25,' +
					'["action"] = "Landing",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = 168,' +
					'["task"]={' +
						'["id"] = "ComboTask",' +
						'["params"] = {' +
							'["tasks"]={' +
								'[1] = {' +
									'["number"] = 1,' +
									'["auto"] = false,' +
									'["id"] = "WrappedAction",' +
									'["enabled"] = true,' +
									'["params"] = {' +
										'["action"] = {' +
											'["id"] = "Option",' +
											'["params"] = {' +
												'["value"] = 2,' +
												'["name"] = 1,' +
											'},' +
										'},' +
									'},' +
								'},' +
							'},' +
						'},' +
					'},' +
					'["type"] = "Land",' +
					//'["ETA"] = 712.36534243372,' +
					//'["ETA_locked"] = false,' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 1, 1]) + ', ' + _.get(routes, ['routeLocs', 1, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 1, 1]) + ', ' + _.get(routes, ['routeLocs', 1, 0]) + ').z, ' +
					//'["name"] = "DictKey_WptName_21362",' +
					//'["formation_template"] = "",' +
					'["airdromeId"] = ' + _.get(routes, 'baseId') + ',' +
					//'["speed_locked"] = true,' +
				'},' +
			'}' +
		'},'
	;
});

_.set(exports, 'landHeliRouteTemplate', function ( routes ) {
	return 	'' +
		'["route"] = {' +
			'["points"] = {' +
				'[1] = {' +
					'["alt"] = 500,' +
					'["action"] = "Turning Point",'+
					'["alt_type"] = "BARO",' +
					'["speed"] = 70,' +
					'["task"] = {'+
						'["id"] = "ComboTask",' +
						'["params"]={' +
							'["tasks"]={' +
								'[1]={' +
									'["enabled"]=true,' +
									'["auto"]=false,' +
									'["id"]="WrappedAction",' +
									'["number"] = 1,' +
									'["params"]={' +
										'["action"]={' +
											'["id"] = "Option",' +
											'["params"]={' +
												'["value"] = 2,' +
												'["name"] = 1,' +
											'},' +
										'},' +
									'},' +
								'},' +
								'[2] = {' +
									'["enabled"] = true,' +
									'["auto"]=false,' +
									'["id"]="Land",' +
									'["number"]= 2,' +
									'["params"]={' +
										'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 1, 1]) + ', ' + _.get(routes, ['routeLocs', 1, 0]) + ').x, ' +
										'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 1, 1]) + ', ' + _.get(routes, ['routeLocs', 1, 0]) + ').z, ' +
										'["duration"] = 300,' +
										'["durationFlag"] = false,' +
									'},' +
								'},' +
							'},' +
						'},' +
					'},' +
					'["type"] = "Turning Point",' +
					//'["ETA"] = 0,' +
					//'["ETA_locked"] = true,' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 0, 1]) + ', ' +  _.get(routes, ['routeLocs', 0, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 0, 1]) + ', ' +  _.get(routes, ['routeLocs', 0, 0]) + ').z, ' +
					//'["name"] = "waypoint 1",' +
					//'["formation_template"] = "",' +
					//'["speed_locked"] = true,' +
				'},' +
			'},' +
		'},'
	;
});

_.set(exports, 'grndUnitGroup', function ( groupObj, task, routes ) {

	var curRoute = '';
	var curTask = '';

	if (routes) {
		curRoute = routes;
	}

	if (task) {
		curTask = '["task"] = "' + task + '",';
	}

	return '{' +
		'["groupId"] = ' + _.get(groupObj, 'groupId') + ',' +
		'["name"] = "' + _.get(groupObj, 'groupName') + '",' +
		'["visible"] = ' + _.get(groupObj, 'visible', false) + ',' +
		'["hidden"] = ' + _.get(groupObj, 'hidden', false) + ',' +
		'["task"] = ' + _.get(groupObj, 'task', '{}') + ',' +
		'["units"] = {#UNITS},' +
		'["category"] = Group.Category.' + _.get(groupObj, 'category') + ',' +
		'["country"] = "' + _.get(groupObj, 'country') + '",' +
		curTask +
		curRoute +
	'}';
});

_.set(exports, 'grndUnitTemplate', function ( unitObj ) {
	return '{' +
		'["x"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').x, ' +
		'["y"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').z, ' +
		'["type"] = "' + _.get(unitObj, 'type') +'",' +
		'["name"] = "' + _.get(unitObj, 'name') + '",' +
		'["unitId"] = ' + _.get(unitObj, 'unitId') + ',' +
		'["heading"] = ' + _.get(unitObj, 'heading', 0) + ',' +
		'["playerCanDrive"] = ' + _.get(unitObj, 'playerCanDrive', false) + ',' +
		'["skill"] = "' + _.get(unitObj, 'skill', "Excellent") + '",' +
		'}'
	;
});

_.set(exports, 'airUnitTemplate', function ( unitObj ) {
	return '{' +
		'["x"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').x, ' +
		'["y"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').z, ' +
		'["type"] = "' + _.get(unitObj, 'type') +'",' +
		'["name"] = "' + _.get(unitObj, 'name') + '",' +
		'["unitId"] = ' + _.get(unitObj, 'unitId') + ',' +
		'["heading"] = ' + _.get(unitObj, 'heading', 0) + ',' +
		'["skill"] = "' + _.get(unitObj, 'skill', "Excellent") + '",' +
		'["payload"]={' +
			'["pylons"]={},' +
			'["fuel"] = "20830",' +
			'["flare"] = 60,' +
			'["chaff"] = 120,' +
			'["gun"] = 100,' +
		'},' +
	'}';
});

_.set(exports, 'staticTemplate', function (staticObj) {
	var retObj = '{' +
		'["x"] = coord.LLtoLO(' + _.get(staticObj, ['lonLatLoc', 1]) + ', ' +  _.get(staticObj, ['lonLatLoc', 0]) + ').x, ' +
		'["y"] = coord.LLtoLO(' + _.get(staticObj, ['lonLatLoc', 1]) + ', ' +  _.get(staticObj, ['lonLatLoc', 0]) + ').z, ' +
		'["category"] = "' + _.get(staticObj, 'category') + '",' +
		'["country"] = "' + _.get(staticObj, 'country') + '",' +
		'["type"] = "' + _.get(staticObj, 'type') +'",' +
		'["name"] = "' + _.get(staticObj, 'name') + '",' +
		'["unitId"] = ' + _.get(staticObj, 'unitId') + ',' +
		'["heading"] = ' + _.get(staticObj, 'heading', 0) + ',' +
		'["shape_name"] = "' + _.get(staticObj, 'shape_name') + '",' +
		'["canCargo"] = ' + _.get(staticObj, 'canCargo', false) + ',';
		if (_.get(staticObj, 'canCargo', false)) {
			retObj += '["mass"] = "' + _.get(staticObj, 'weight') + '",';
		}
	retObj += '}';
	return retObj;
});

_.set(exports, 'getUnitDictionary', function () {
	return dbSystemServiceController.unitDictionaryActions('read')
		.then(function (unitsDic) {
			return new Promise(function (resolve) {
				resolve(unitsDic);
			});
		})
		.catch(function (err) {
			console.log('err line103: ', err);
		})
	;
});

_.set(exports, 'getBases', function (serverName) {
	return dbMapServiceController.baseActions('read', serverName)
		.then(function (bases) {
			return new Promise(function (resolve) {
				resolve(bases);
			});
		})
		.catch(function (err) {
			console.log('err line110: ', err);
		})
	;
});

_.set(exports, 'getServer', function ( serverName ) {
	return dbSystemServiceController.serverActions('read', {_id: serverName})
		.then(function (server) {
			return new Promise(function (resolve) {
				resolve(_.first(server));
			});
		})
		.catch(function (err) {
			console.log('err line101: ', err);
		})
		;
});

_.set(exports, 'getRndFromSpawnCat', function (spawnCat, side, spawnAlways) {
	var curEnabledCountrys = _.get(countryCoObj, _.get(countryCoObj, ['side', side]));
	var findUnits = _.filter(_.get(exports, 'unitDictionary'), {spawnCat: spawnCat, enabled: true});
	var cPUnits = [];
	var randomIndex;
	var unitsChosen = [];
	_.forEach(findUnits, function (unit) {
		if(_.intersection(_.get(unit, 'country'), curEnabledCountrys).length > 0) {
			cPUnits.push(unit);
		}
	});
	if (cPUnits.length < 0) {
		reject('cPUnits are less than zero');
	}
	if (spawnAlways) {
		randomIndex = _.random(0, cPUnits.length-1);
		if (cPUnits[randomIndex]) {
			unitsChosen.push(cPUnits[randomIndex]);
		}
	} else {
		randomIndex = _.random(0, cPUnits.length);
		if (cPUnits[randomIndex]) {
			unitsChosen.push(cPUnits[randomIndex]);
		}
	}

	if(_.get(unitsChosen, [0, 'comboName'])) {
		unitsChosen = _.filter(cPUnits, {comboName: _.get(unitsChosen, [0, 'comboName'])});
	}
	return unitsChosen;
});

_.set(exports, 'spawnSupportVehiclesOnFarp', function ( serverName, baseName, side ) {
	var curBase = _.find(_.get(exports, ['servers', serverName, 'bases']), {name: baseName});
	var curFarpArray = [];
	var sptArray = [
		"unarmedAmmo",
		"unarmedFuel",
		"unarmedPower"
	];
	var curAng = _.cloneDeep(curBase.hdg);
	if (curAng > 180) {
		curAng = curAng - 90
	} else {
		curAng = curAng + 270
	}
	_.forEach(sptArray, function (val) {
		var sptUnit = _.cloneDeep(_.first(exports.getRndFromSpawnCat(val, side, true)));
		_.set(sptUnit, 'lonLatLoc', zoneController.getLonLatFromDistanceDirection(_.get(curBase, ['centerLoc']), curAng, 0.05));
		curAng += 15;
		curFarpArray.push(sptUnit);
	});
	return curFarpArray;
});

_.set(exports, 'spawnSupportBaseGrp', function ( serverName, baseName, side, init ) {
	var curBaseObj = {};
	var spawnArray = [];
	var curBases = _.get(exports, ['servers', serverName, 'bases']);
	var farpBases = _.filter(curBases, {farp: true});
	var expBases = _.filter(curBases, {expansion: true});
	var curEnabledCountrys = _.get(countryCoObj, _.get(countryCoObj, ['side', side]));
	if (_.includes(baseName, 'FARP')) {
		var curFarpBases = _.filter(farpBases, function (farp) {
			return _.first(_.split(_.get(farp, 'name'), ' #')) === baseName &&
				!_.isEmpty(_.intersection([_.get(farp, 'country')], curEnabledCountrys));
		});
		_.forEach(curFarpBases, function (farp) {
			spawnArray = _.concat(spawnArray, exports.spawnSupportVehiclesOnFarp( serverName, _.get(farp, 'name'), side ));
		});
	} else {
		var curExpBases = _.filter(expBases, function (exp) {
			return _.first(_.split(_.get(exp, 'name'), ' #')) === baseName + '_Expansion' &&
				!_.isEmpty(_.intersection([_.get(exp, 'country')], curEnabledCountrys));
		});
		_.forEach(curExpBases, function (exp) {
			spawnArray = _.concat(spawnArray, exports.spawnSupportVehiclesOnFarp( serverName, _.get(exp, 'name'), side ));
		});
	}

	for (var i = 0; i < 3; i++) {
		spawnArray = _.concat(spawnArray, _.cloneDeep(exports.getRndFromSpawnCat( 'armoredCar', side )));
	}

	//spawn logistics
	curBaseObj = _.find(curBases, {name: baseName});
	exports.spawnLogisticCmdCenter(serverName, {}, curBaseObj, side, init);

	return _.compact(spawnArray);
});

_.set(exports, 'spawnBaseReinforcementGroup', function (serverName, side) {
	var curServer = _.get(exports, ['servers', serverName, 'config']);
	var spawnArray = [];
	var curBaseSpawnCats = _.get(curServer, 'spwnLimitsPerTick');
	_.forEach(curBaseSpawnCats, function (tickVal, name) {
		if (tickVal > 0) {
			for (var i = 0; i < tickVal; i++) {
				spawnArray = _.concat(spawnArray, _.cloneDeep(exports.getRndFromSpawnCat( name, side )));
			}
		}
	});
	return _.compact(spawnArray);
});

_.set(exports, 'spawnSupportPlane', function (serverName, baseObj, side, farpBase) {
	var unitNum;
	var curBaseName;
	var curUnitName;
	var curUnitSpawn;
	var curGroupSpawn;
	var curSide;
	var curSpwnUnit;
	var curGrpObj = {};
	var curRoutes;
	var baseLoc;
	var remoteLoc;
	var grpNum = _.random(1000000, 9999999);

	curSide = (side) ? _.get(countryCoObj, ['defCountrys', side]) : _.get(countryCoObj, ['defCountrys', _.get(curGrpObj, 'coalition')]);
	curBaseName = 'AI|1010101|' + _.get(baseObj, 'name') + '|LOGISTICS|';
	if (_.get(baseObj, 'farp', false)) {
		baseLoc = _.get(farpBase, 'centerLoc');
		console.log('FARP BASE: ', baseLoc);
	} else {
		baseLoc = _.get(baseObj, 'centerLoc');
		console.log('REG BASE: ', baseLoc);
	}

	if(_.get(baseObj, 'farp')) {
		curSpwnUnit = _.cloneDeep(_.first(exports.getRndFromSpawnCat( 'transportHeli', side, true )));
		remoteLoc = zoneController.getLonLatFromDistanceDirection(baseLoc, _.get(baseObj, 'spawnAngle'), 40);
	} else {
		curSpwnUnit = _.cloneDeep(_.first(exports.getRndFromSpawnCat( 'transportAircraft', side, true )));
		remoteLoc = zoneController.getLonLatFromDistanceDirection(baseLoc, _.get(baseObj, 'spawnAngle'), 70);
	}
	curGrpObj = _.cloneDeep(curSpwnUnit);
	_.set(curGrpObj, 'groupId', grpNum);
	_.set(curGrpObj, 'groupName', curBaseName);
	_.set(curGrpObj, 'country', curSide);
	curRoutes = {
		baseId: _.get(baseObj, 'baseId'),
		routeLocs: [
			remoteLoc,
			baseLoc
		]
	};
	if(_.get(baseObj, 'farp')) {
		curGroupSpawn = exports.grndUnitGroup( curGrpObj, 'Transport', exports.landHeliRouteTemplate(curRoutes));
	} else {
		curGroupSpawn = exports.grndUnitGroup( curGrpObj, 'Transport', exports.landPlaneRouteTemplate(curRoutes));
	}

	unitNum = _.cloneDeep(grpNum);

	unitNum += 1;
	curUnitName = 'AI|1010101|' + _.get(baseObj, 'name') + '|LOGISTICS|';


	_.set(curSpwnUnit, 'lonLatLoc', remoteLoc);
	_.set(curSpwnUnit, 'unitId', unitNum);
	_.set(curSpwnUnit, 'name', curUnitName);
	_.set(curSpwnUnit, 'playerCanDrive', false);

	curUnitSpawn = exports.airUnitTemplate(curSpwnUnit);

	curGroupSpawn = _.replace(curGroupSpawn, "#UNITS", curUnitSpawn);
	// console.log('spawnSupportPlane: ', curGroupSpawn, curSide, curGrpObj.category);
	var curCMD = exports.spawnGrp(curGroupSpawn, curSide, curGrpObj.category);
	var sendClient = {action: "CMD", cmd: [curCMD], reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line428: ', err);
		})
	;
});

_.set(exports, 'spawnLogiGroup', function (serverName, spawnArray, side) {
	var grpNum = 0;
	var unitNum = 0;
	var unitVec2;
	var curBaseName = '';
	var curUnitName = '';
	var curUnitSpawn = '';
	var curGroupSpawn;
	var curGrpObj = {};
	var curSide;
	var curSpwnUnit;
	var sArray = _.compact(_.cloneDeep(spawnArray));
	curGrpObj = _.get(sArray, 0);
	if (curGrpObj) {
		grpNum = _.get(curGrpObj, 'groupId', _.random(1000000, 9999999));
		curSide = (side) ? _.get(countryCoObj, ['defCountrys', side]) : _.get(countryCoObj, ['defCountrys', _.get(curGrpObj, 'coalition')]);
		if(curGrpObj.country === 'UKRAINE') {
			curSide = 'UKRAINE';
		}

		curBaseName = curGrpObj.spwnName + ' #' + grpNum;

		_.set(curGrpObj, 'groupId', grpNum);
		_.set(curGrpObj, 'groupName', curBaseName);
		_.set(curGrpObj, 'country', curSide);
		curGroupSpawn = exports.grndUnitGroup( curGrpObj );
		unitNum = _.cloneDeep(grpNum);
		_.forEach(sArray, function (curUnit) {
			curSpwnUnit = _.cloneDeep(curUnit);
			if(unitNum !== grpNum) {
				curUnitSpawn += ','
			}
			unitNum += 1;
			curUnitName = curSpwnUnit.spwnName + ' #' + unitNum;

			_.set(curSpwnUnit, 'lonLatLoc', zoneController.getLonLatFromDistanceDirection(curSpwnUnit.lonLatLoc, curSpwnUnit.heading, 0.05));
			_.set(curSpwnUnit, 'unitId', _.get(curSpwnUnit, 'unitId', unitNum));
			_.set(curSpwnUnit, 'name', curUnitName);
			_.set(curSpwnUnit, 'playerCanDrive', _.get(curSpwnUnit, 'playerCanDrive', true));
			curUnitSpawn += exports.grndUnitTemplate(curSpwnUnit);
		});
		curGroupSpawn = _.replace(curGroupSpawn, "#UNITS", curUnitSpawn);
		// var curCMD = 'mist.dynAdd(' + curGroupSpawn + ')';
		var curCMD = exports.spawnGrp(curGroupSpawn, curSide, curGrpObj.category);
		var sendClient = {action: "CMD", cmd: [curCMD], reqID: 0};
		var actionObj = {actionObj: sendClient, queName: 'clientArray'};
		dbMapServiceController.cmdQueActions('save', serverName, actionObj)
			.catch(function (err) {
				console.log('erroring line476: ', err);
			})
		;
	}
});

_.set(exports, 'spawnGroup', function (serverName, spawnArray, baseName, side) {
	var grpNum = 0;
	var unitNum = 0;
	var unitVec2;
	var curBaseName = '';
	var curUnitName = '';
	var curUnitSpawn = '';
	var curGroupSpawn;
	var curGrpObj = {};
	var curSide;
	var curSpwnUnit;
	var sArray = _.compact(_.cloneDeep(spawnArray));
	curGrpObj = _.get(sArray, 0);
	if (curGrpObj) {
		grpNum = _.get(curGrpObj, 'groupId', _.random(1000000, 9999999));
		curSide = (side) ? _.get(countryCoObj, ['defCountrys', side]) : _.get(curGrpObj, 'country', _.get(countryCoObj, ['defCountrys', _.get(curGrpObj, 'coalition')]));
		curBaseName = (baseName) ? baseName + ' #' + grpNum : _.get(curGrpObj, 'groupName');
		_.set(curGrpObj, 'groupId', grpNum);
		_.set(curGrpObj, 'groupName', curBaseName);
		_.set(curGrpObj, 'country', curSide);
		curGroupSpawn = exports.grndUnitGroup( curGrpObj );
		unitNum = _.cloneDeep(grpNum);
		_.forEach(sArray, function (curUnit) {
			curSpwnUnit = _.cloneDeep(curUnit);
			if(unitNum !== grpNum) {
				curUnitSpawn += ','
			}
			unitNum += 1;
			curUnitName = baseName + ' #' + unitNum;

			if (_.isUndefined(_.get(curSpwnUnit, 'lonLatLoc'))) {
				_.set(curSpwnUnit, 'lonLatLoc', zoneController.getRandomLatLonFromBase(serverName, baseName));
			}
			_.set(curSpwnUnit, 'unitId', _.get(curSpwnUnit, 'unitId', unitNum));
			_.set(curSpwnUnit, 'name', _.get(curSpwnUnit, 'name', curUnitName));
			curUnitSpawn += exports.grndUnitTemplate(curSpwnUnit);
		});
		curGroupSpawn = _.replace(curGroupSpawn, "#UNITS", curUnitSpawn);
		// var curCMD = 'mist.dynAdd(' + curGroupSpawn + ')';
		var curCMD = exports.spawnGrp(curGroupSpawn, curSide, curGrpObj.category);
		// console.log('cmd: ', curCMD);
		var sendClient = {action: "CMD", cmd: [curCMD], reqID: 0};
		var actionObj = {actionObj: sendClient, queName: 'clientArray'};
		dbMapServiceController.cmdQueActions('save', serverName, actionObj)
			.catch(function (err) {
				console.log('erroring line525: ', err);
			})
		;
	}
});

_.set(exports, 'spawnNewMapGrps', function ( serverName ) {
	var curServer = _.get(exports, ['servers', serverName, 'config']);
	var defBaseSides = _.get(curServer, 'defBaseSides');
	_.forEach(defBaseSides, function (extSide, extName) {
		var spawnArray = [];
		dbMapServiceController.baseActions('updateSide', serverName, {name: extName, side: extSide})
			.then(function (bases) {
				spawnArray = _.concat(spawnArray, exports.spawnSupportBaseGrp(serverName, extName, extSide, true));

				while (spawnArray.length < curServer.replenThreshold) { //UNCOMMENT THESE
					spawnArray = _.concat(spawnArray, exports.spawnBaseReinforcementGroup(serverName, extSide));
				}

				exports.spawnGroup(serverName, spawnArray, extName, extSide);
			})
			.catch(function (err) {
				console.log('line799', err);
			})
		;
	});
});

_.set(exports, 'initDbs', function ( serverName ) {
	exports.getUnitDictionary()
		.then(function (unitDict) {
			_.set(exports, 'unitDictionary', unitDict);
			exports.getBases( serverName )
				.then(function (bases) {
					_.set(exports, ['servers', serverName, 'bases'], bases);
					exports.getServer( serverName )
						.then(function (server) {
							_.set(exports, ['servers', serverName, 'config'], server);
						})
					;

				})
			;

		})
	;
});

_.set(exports, 'spawnLogisticCmdCenter', function (serverName, staticObj, baseObj, side, init) {
	var curGrpObj = _.cloneDeep(staticObj);
	var curStaticSpawn;
	_.set(curGrpObj, 'unitId', _.get(curGrpObj, 'unitId', _.random(1000000, 9999999)));
	_.set(curGrpObj, 'name', _.get(curGrpObj, 'name', _.get(baseObj, 'name', '') + ' Logistics'));
	_.set(curGrpObj, 'coalition', _.get(curGrpObj, 'coalition', side));
	_.set(curGrpObj, 'country', _.get(countryCoObj, ['defCountrys', curGrpObj.coalition]));
	if (_.isUndefined(_.get(curGrpObj, 'lonLatLoc'))) {
		_.set(curGrpObj, 'lonLatLoc',  zoneController.getLonLatFromDistanceDirection(_.get(baseObj, ['logiCenter']), 0, 0.05));
	}
	_.set(curGrpObj, 'category', 'Fortifications');
	_.set(curGrpObj, 'type', '.Command Center');
	_.set(curGrpObj, 'shape_name', 'ComCenter');
	curStaticSpawn = exports.staticTemplate(curGrpObj);

	var curCMD = exports.spawnStatic(serverName, curStaticSpawn, curGrpObj.country, curGrpObj.name, init);
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line592: ', err);
		})
	;
	dbMapServiceController.unitActions('updateByName', serverName, {name: curGrpObj.name, coalition: curGrpObj.coalition, country: curGrpObj.country, dead:false})
		.catch(function (err) {
			console.log('erroring line595: ', err);
		})
	;
});

_.set(exports, 'replenishUnits', function ( serverName, baseName, side ) {
	exports.spawnGroup(serverName, exports.spawnBaseReinforcementGroup(serverName, side), baseName, side);
});

_.set(exports, 'destroyUnit', function ( serverName, unitName ) {
	// DONT USE ON CLIENT AIRCRAFT
	var sendClient = {action: "REMOVEOBJECT", removeObject: unitName, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line613: ', err);
		})
	;
});

_.set(exports, 'healBase', function ( serverName, baseName ) {
	//respawn farp tower to 'heal' it
	dbMapServiceController.unitActions('read', serverName, {name: baseName + ' Logistics', proxChkGrp: 'logisticTowers'})
		.then(function (logiUnit) {
			var curUnit = _.get(logiUnit, [0], {});
			exports.spawnLogisticCmdCenter(serverName, curUnit);
		})
		.catch(function (err) {
			console.log('erroring line613: ', err);
		})
	;
});

_.set(exports, 'loadOnDemandGroup', function ( groupObj ) {

});

_.set(exports, 'unloadOnDemandGroup', function ( groupObj ) {

});
