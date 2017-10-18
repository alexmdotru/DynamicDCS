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

_.set(exports, 'spawnSupportVehiclesOnFarp', function ( serverName, baseName, side ) {
	/* spawn vehicles on farp pads properly */
	var curEnabledCountrys = _.get(countryCoObj, [_.get(countryCoObj, side)]);
	console.log('cnt: ', curEnabledCountrys, side);
	dbMapServiceController.baseActions('read', serverName,
		{$and: [
				{$or: [
					{farp: true},
					{expansion: true}
					]
				},
				{name: {$regex: ".*" + baseName + ".*"}}
			]
		})
		.then(function (farps) {
			//get vehicles setup
			dbSystemServiceController.unitDictionaryActions('read')
				.then(function (unitsDic) {
					//var cur


					_.forEach(farpsExp, function (farpExp) {




					});
				})
				.catch(function (err) {
					console.log('err line101: ', err);
				})
			;


		//	var curAmmo
		//	var curFuel
		//	var curRepair


			// console.log('farps&exp: ', farps);
		})
		.catch(function (err) {
				console.log('err line101: ', err);
		})
	;
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
	//get default color for base, for new map
	dbSystemServiceController.serverActions('read', {_id: serverName})
		.then(function (servers) {
			var curBaseName = _.get(groupObj, [0, 'baseName']);
			// var defBaseSide = _.get(servers, [0, 'defBaseSides', curBaseName]);
			for (var k in servers) {
				console.log(servers[k]);
				for (var l in k.defBaseSides) {
					console.log(k.defBaseSides[l]);
				}
			}
			//console.log('dbs: ', server.defBaseSides, server);
			// exports.spawnSupportVehiclesOnFarp(serverName, _.get(groupObj, [0, 'baseName']), defBaseSide);
		})
		.catch(function (err) {
			console.log('line145: ', err);
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
