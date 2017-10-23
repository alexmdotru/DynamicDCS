const	_ = require('lodash'),
		js2lua = require('js2lua');

const dbMapServiceController = require('./dbMapService');
const dbSystemServiceController = require('./dbSystemService');

// from my main mission object, can spawn units on both sides in this setup
var countryCoObj = {
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
		'["task"] = ' + _.get(groupObj, 'task', {}) + ',' +
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

_.set(exports, 'getServer', function (serverName) {
	return dbMapServiceController.baseActions('read', serverName)
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
	var findUnits = _.find(_.get(exports, 'unitDictionary'), {spawnCat: spawnCat});
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
	randomIndex = _.random(0, cPUnits.length - 1);
	if (cPUnits[randomIndex]) {
		unitsChosen.push(cPUnits[randomIndex]);
	}

	if(_.get(unitsChosen, 'comboName')) {
		unitsChosen = _.filter(cPUnits, {comboName: _.get(unitsChosen, [0, 'comboName'])});
	}
	return unitsChosen;
});

_.set(exports, 'spawnSupportVehiclesOnFarp', function ( serverName, side ) {
	var curFarpArray = [];
	_.forEach(_.get(exports, ['servers', serverName, 'bases']), function (base) {
		if (_.get(base, 'extension') || _.get(base, 'farp')) {
			var curSide = _.get(base, 'side');
			curFarpArray = _.concat(curFarpArray, exports.getRndFromSpawnCat("unarmedAmmo", curSide));
			curFarpArray = _.concat(curFarpArray, exports.getRndFromSpawnCat("unarmedFuel", curSide));
			curFarpArray = _.concat(curFarpArray, exports.getRndFromSpawnCat("unarmedPower", curSide));
		}
	});
	console.log('CURARRAY: ', curFarpArray);
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

_.set(exports, 'spawnNewMapGrp', function ( serverName, groupObj ) {
	exports.getUnitDictionary()
		.then(function (unitDict) {
			_.set(exports, 'unitDictionary', unitDict);
			exports.getBases( serverName )
				.then(function (bases) {
					_.set(exports, ['servers', serverName, 'bases'], bases);
					exports.getServer( serverName )
						.then(function (server) {
							_.set(exports, ['servers', serverName, 'details'], server);

							var curBaseName = _.get(groupObj, 'baseName');
							var curBaseSide = _.get(server, ['defBaseSides', curBaseName]);
							var curBaseSpawnCats = _.get(server, 'spwnLimitsPerTick');

							var spawnArray = exports.spawnSupportVehiclesOnFarp(serverName, curBaseSide);

							/*
							 _.forEach(curBaseSpawnCats, function (tickVal, name) {
							 if(tickVal > 0) {
							 spawnArray = _.concat(spawnArray, exports.getRndFromSpawnCat(name, curBaseSide));
							 }
							 });
							 */
							console.log('SA: ', spawnArray);


						})
					;

				})
			;

		})
	;
});

/*
 spawn random allocations from these groups
 unarmedAmmo
 unarmedFuel
 unarmedPower

 Tank
 APC
 armoredCar
 troop
 armedStructure

 antiAir
 samRadar (check if single or group, spawn group is group exist, launcher)
 samIR

 carrierShip
 defenseShip

 var newSpawnCountry = 'USA';
 var newSpawnCategory = 'GROUND';
 var newVehicleType = 'AAV7';

 var curGroup = {};
 var cRnd = _.random(1000000,9000000);

 curGroup = defGndGroup;
 curGroup = _.replace(curGroup,"#UNITS",curUnits);
 return curGroup;
 */
