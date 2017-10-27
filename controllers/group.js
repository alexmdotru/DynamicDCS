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
	return '{' +
		'["x"] = ' + _.get(unitObj, 'x') + ',' +
		'["y"] = ' + _.get(unitObj, 'y') + ',' +
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

_.set(exports, 'getRndFromSpawnCat', function (spawnCat, side) {
	var curEnabledCountrys = _.get(countryCoObj, _.get(countryCoObj, ['side', side]));
	var findUnits = _.filter(_.get(exports, 'unitDictionary'), {spawnCat: spawnCat});
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
	randomIndex = _.random(0, cPUnits.length + 1);
	if (cPUnits[randomIndex]) {
		unitsChosen.push(cPUnits[randomIndex]);
	}

	if(_.get(unitsChosen, [0, 'comboName'])) {
		unitsChosen = _.filter(cPUnits, {comboName: _.get(unitsChosen, [0, 'comboName'])});
	}
	return unitsChosen;
});

_.set(exports, 'spawnSupportVehiclesOnFarp', function ( serverName, baseName, side ) {
	var curFarpArray = [];
	_.set(curFarpArray, baseName, _.get(curFarpArray, baseName, []));
	_.set(curFarpArray, baseName, _.concat(_.get(curFarpArray, baseName), exports.getRndFromSpawnCat("unarmedAmmo", side)));
	_.set(curFarpArray, baseName, _.concat(_.get(curFarpArray, baseName), exports.getRndFromSpawnCat("unarmedFuel", side)));
	_.set(curFarpArray, baseName, _.concat(_.get(curFarpArray, baseName), exports.getRndFromSpawnCat("unarmedPower", side)));
	return curFarpArray;
});

_.set(exports, 'spawnSupportBaseGrp', function ( groupObj ) {
	/* spawn all support and some low end humvee
		load config vars for server
		spawn
	*/
});

_.set(exports, 'spawnBaseReinforcementGroup', function ( groupObj ) {

});

_.set(exports, 'depopGroup', function ( groupObj ) {

});

_.set(exports, 'repopGroup', function ( groupObj ) {

});

_.set(exports, 'spawnGroup', function (serverName, spawnArray, isNewGroup, baseName, side) {
	var grpNum = 0;
	var unitNum = 0;
	var unitVec2;
	var curGrpName = '';
	var curUnitName = '';
	var curUnitSpawn = '';
	var curGroupSpawn = '';
	var curGrpObj = {};

	if(isNewGroup) {
		grpNum = _.random(1000000, 9999999);
		curGrpName = _.getbaseName + ' #' + grpNum;
		curGrpObj = _.get(spawnArray, 0);
		_.set(curGrpObj, 'groupId', grpNum);
		_.set(curGrpObj, 'groupName', curGrpName);
		_.set(curGrpObj, 'country', _.get(countryCoObj, ['defCountrys', side]));

		curGroupSpawn = exports.grndUnitGroup( curGrpObj );

		unitNum = _.cloneDeep(grpNum);
		_.forEach(spawnArray, function (spwnUnit) {
			if(unitNum !== grpNum) {
				curUnitSpawn += ','
			}
			unitNum += 1;
			curUnitName = baseName + ' #' + unitNum;
			unitVec2 = zoneController.getRandomVec2FromBase(serverName, baseName);
			_.set(spwnUnit, 'unitId', unitNum);
			_.set(spwnUnit, 'name', curUnitName);
			_.set(spwnUnit, 'x', unitVec2.x);
			_.set(spwnUnit, 'y', unitVec2.y);

			curUnitSpawn += exports.grndUnitTemplate(spwnUnit);
		});
		curGroupSpawn = _.replace(curGroupSpawn, "#UNITS", curUnitSpawn);
	} else {
		grpNum = _.get(curGrpObj, 'groupId');
		curGrpObj = _.get(spawnArray, 0);
		curGroupSpawn = exports.grndUnitGroup( curGrpObj );

		unitNum = _.cloneDeep(grpNum);
		_.forEach(spawnArray, function (spwnUnit) {
			if(unitNum !== grpNum) {
				curUnitSpawn += ','
			}
			unitNum += 1;
			curUnitName = _.get(spwnUnit, 'name');
			baseName = _.first(_.split(curUnitName, ' #'));
			unitVec2 = zoneController.getRandomVec2FromBase(serverName, baseName);
			_.set(spwnUnit, 'unitId', _.get(spwnUnit, 'unitId'));
			_.set(spwnUnit, 'name', curUnitName);
			_.set(spwnUnit, 'x', _.get(spwnUnit, 'x'));
			_.set(spwnUnit, 'y', _.get(spwnUnit, 'y'));

			curUnitSpawn += exports.grndUnitTemplate(spwnUnit);
		});
		curGroupSpawn = _.replace(curGroupSpawn, "#UNITS", curUnitSpawn);
	}



	var curCMD = 'mist.dynAdd(' + curGroupSpawn + ')';
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});

_.set(exports, 'spawnNewMapGrps', function ( serverName ) {
	exports.getUnitDictionary()
		.then(function (unitDict) {
			_.set(exports, 'unitDictionary', unitDict);
			exports.getBases( serverName )
				.then(function (bases) {
					_.set(exports, ['servers', serverName, 'bases'], bases);
					exports.getServer( serverName )
						.then(function (server) {
							var totalTicks = _.get(server, 'totalTicks');
							var defBaseSides = _.get(server, 'defBaseSides');
							var curBaseSpawnCats = _.get(server, 'spwnLimitsPerTick');
							var farpBases = _.filter(bases, {farp: true});
							var expBases = _.filter(bases, {expansion: true});

							_.forEach(defBaseSides, function (extSide, extName) {

								var spawnArray = [];
								var curEnabledCountrys = _.get(countryCoObj, _.get(countryCoObj, ['side', extSide]));
								if (_.includes(extName, 'FARP')) {
									var curFarpBases = _.filter(farpBases, function (farp) {
										return _.includes(_.get(farp, 'name'), extName) &&
											!_.isEmpty(_.intersection([_.get(farp, 'country')], curEnabledCountrys));
									});
									_.forEach(curFarpBases, function (farp) {
										spawnArray = exports.spawnSupportVehiclesOnFarp( serverName, _.get(farp, 'name'), extSide );
									});
								} else {
									var curExpBases = _.filter(expBases, function (exp) {
										return _.includes(_.get(exp, 'name'), extName) &&
											!_.isEmpty(_.intersection([_.get(exp, 'country')], curEnabledCountrys));
									});
									_.forEach(curExpBases, function (exp) {
										spawnArray = exports.spawnSupportVehiclesOnFarp( serverName, _.get(exp, 'name'), extSide );
									});
								}

								_.forEach(curBaseSpawnCats, function (tickVal, name) {
									if(tickVal > 0) {
										spawnArray = _.concat(spawnArray, exports.getRndFromSpawnCat(name, extSide));
									}
								});
								exports.spawnGroup(serverName, spawnArray, true, extName, extSide);
							});
						})
					;

				})
			;

		})
	;
});
