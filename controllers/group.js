const	_ = require('lodash'),
		js2lua = require('js2lua');

const dbMapServiceController = require('./dbMapService');

_.set(exports, 'spawnGrndUnit', function (serverName, groupObj, routeArry, unitArry) {
	var curGroup = {};
	var getRnd = function () {
		return _.random(1000000,9000000);
	};

	var defGndGroup = '{' +
		'["groupId"] = ' + getRnd() +',' +
		'["name"] = "' + _.get(groupObj, 'name') + '_' + getRnd() + '",' +
		'["visible"] = false,' +
		'["hidden"] = false,' +
		'["task"] = {},' +
		'["units"] = {#UNITS},' +
		'["category"] = Group.Category.GROUND,' +
		'["country"] = "USA"' +
	'}';
	/*
	var defGndGroup = '{'+
		'["groupId"] = ' + getRnd() +',' +
		'["name"] = "' + _.get(groupObj, 'name') + '_' + getRnd() + '",' +
		'["visible"] = false,' +
		'["hidden"] = false,' +
		'["task"] = {},' +
		'["units"] = {#UNITS}' +

	'}';
	*/

	curGroup = defGndGroup;
	var curUnits = '';
	_.forEach(unitArry, function (unit, k) {
		var cma = '';
		var curUnit = '{' +
			'["x"] = ' + _.get(unit, 'x') + ',' +
			'["y"] = ' + _.get(unit, 'y') + ',' +
			'["type"] = "AAV7",' +
			'["name"] = "' + _.get(unit, 'name') + '_' + getRnd() + '",' +
			'["unitId"] = ' + getRnd() + ',' +
			'["heading"] = 0,' +
			'["playerCanDrive"] = true,' +
			'["skill"] = "Excellent"' +
			'}';
		var curUnitNum = k + 1;
		( unitArry.length === curUnitNum ) ? cma = '' : cma = ',';
		curUnits +=  curUnit + cma;
	});
	curGroup = _.replace(curGroup,"#UNITS",curUnits);
	return curGroup;
});
