const	_ = require('lodash'),
		js2lua = require('js2lua');

const dbMapServiceController = require('./dbMapService');
const dbSystemServiceController = require('./dbSystemService');
const zoneController = require('./zone');

// from my main mission object, can spawn units on both sides in this setup
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
		'KAZAKHSTAN',
		'NORTH_KOREA',
		'PAKISTAN',
		'ROMANIA',
		'RUSSIA',
		'SAUDI_ARABIA',
		'SERBIA',
		'SLOVAKIA',
		'SOUTH_OSETIA',
		'SYRIA',
		'UKRAINE'
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
	]
};

_.set(exports, 'getXYFromDistanceDirection', function (latLonLoc, direction, distance) {
	//gets new xy coord from distance & angle
	return {
		lon: distance * Math.sin(direction*Math.PI/180) + _.get(latLonLoc, [0]),
		lat: distance * Math.cos(direction*Math.PI/180) + _.get(latLonLoc, [1])

	}
});

_.set(exports, 'grndUnitGroup', function ( groupObj ) {
	return '{' +
		'["groupId"] = ' + _.get(groupObj, 'groupId') + ',' +
		'["name"] = "' + _.get(groupObj, 'groupName') + '",' +
		'["visible"] = ' + _.get(groupObj, 'visible', false) + ',' +
		'["hidden"] = ' + _.get(groupObj, 'hidden', false) + ',' +
		'["task"] = ' + _.get(groupObj, 'task', '{}') + ',' +
		'["units"] = {#UNITS},' +
		'["category"] = Group.Category.' + _.get(groupObj, 'category') + ',' +
		'["country"] = "' + _.get(groupObj, 'country') + '"' +
		'}'
	;
});

_.set(exports, 'grndUnitTemplate', function ( unitObj ) {
	console.log('unitObj: ', unitObj);
	return '{' +
		'["x"] = coord.LLtoLO(' + _.get(unitObj, ['latLonLoc', 1]) + ', ' +  _.get(unitObj, ['latLonLoc', 0]) + ').x, ' +
		'["y"] = coord.LLtoLO(' + _.get(unitObj, ['latLonLoc', 1]) + ', ' +  _.get(unitObj, ['latLonLoc', 0]) + ').z, ' +
		'["type"] = "' + _.get(unitObj, 'type') +'",' +
		'["name"] = "' + _.get(unitObj, 'name') + '",' +
		'["unitId"] = ' + _.get(unitObj, 'unitId') + ',' +
		'["heading"] = ' + _.get(unitObj, 'heading', 0) + ',' +
		'["playerCanDrive"] = ' + _.get(unitObj, 'playerCanDrive', true) + ',' +
		'["skill"] = ' + _.get(unitObj, 'skill', "Excellent") +
		'}'
	;
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

_.set(exports, 'getRndFromSpawnCat', function (spawnCat, side, spawnAll) {
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
	if (spawnAll) {
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
		_.set(sptUnit, 'latLonSpwn', exports.getXYFromDistanceDirection(_.get(curBase, ['centerLoc']), curAng, 50));
		curAng += 15;
		curFarpArray.push(sptUnit);
	});
	return curFarpArray;
});

_.set(exports, 'spawnSupportBaseGrp', function ( serverName, baseName, side ) {
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

	for (var i = 0; i < 2; i++) {
		spawnArray = _.concat(spawnArray, _.cloneDeep(exports.getRndFromSpawnCat( 'armoredCar', side, true )));
	}

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

_.set(exports, 'depopGroup', function ( groupObj ) {

});

_.set(exports, 'repopGroup', function ( groupObj ) {

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
		curSide = (side) ? _.get(countryCoObj, ['defCountrys', side]) : _.get(countryCoObj, ['defCountrys', _.get(curGrpObj, 'coalition')]);
		curBaseName = (baseName) ? baseName + ' #' + grpNum : _.get(curGrpObj, 'groupName');
		_.set(curGrpObj, 'groupId', grpNum);
		_.set(curGrpObj, 'groupName', curBaseName);
		_.set(curGrpObj, 'country', curSide);
		curGroupSpawn = exports.grndUnitGroup( curGrpObj );
		console.log('cgs: ', curGroupSpawn);
		unitNum = _.cloneDeep(grpNum);
		_.forEach(sArray, function (curUnit) {
			curSpwnUnit = _.cloneDeep(curUnit);
			if(unitNum !== grpNum) {
				curUnitSpawn += ','
			}
			unitNum += 1;
			curUnitName = baseName + ' #' + unitNum;

			if (_.isUndefined(_.get(curSpwnUnit, 'latLonLoc'))) {
				_.set(curSpwnUnit, 'latLonLoc', zoneController.getRandomLatLonFromBase(serverName, baseName));
			}
			_.set(curSpwnUnit, 'unitId', _.get(curSpwnUnit, 'unitId', unitNum));
			_.set(curSpwnUnit, 'name', _.get(curSpwnUnit, 'name', curUnitName));
			curUnitSpawn += exports.grndUnitTemplate(curSpwnUnit);
		});
		curGroupSpawn = _.replace(curGroupSpawn, "#UNITS", curUnitSpawn);
		var curCMD = 'mist.dynAdd(' + curGroupSpawn + ')';
		var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
		var actionObj = {actionObj: sendClient, queName: 'clientArray'};
		dbMapServiceController.cmdQueActions('save', serverName, actionObj);
	}
});

_.set(exports, 'spawnNewMapGrps', function ( serverName ) {
	var curServer = _.get(exports, ['servers', serverName, 'config']);
	var totalTicks = _.get(curServer, 'totalTicks');
	var defBaseSides = _.get(curServer, 'defBaseSides');
	_.forEach(defBaseSides, function (extSide, extName) {
		var spawnArray = [];
		spawnArray = _.concat(spawnArray, exports.spawnSupportBaseGrp(serverName, extName, extSide));
		for (var i = 0; i < totalTicks; i++) {
		//	spawnArray = _.concat(spawnArray, exports.spawnBaseReinforcementGroup(serverName, extSide));
		}
		exports.spawnGroup(serverName, spawnArray, extName, extSide);
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
