const	_ = require('lodash'),
		js2lua = require('js2lua');

const dbMapServiceController = require('./dbMapService');

_.set(exports, 'spawnGrndUnit', function (serverName, groupObj, routeArry, unitArry) {
	var curGroup = {};
	var getRnd = function () {
		return _.random(1000000,9000000);
	};

	var defGndGroup = '{'+
		'["groupId"] = ' + getRnd() +',' +
		'["name"] = "' + _.get(groupObj, 'name') + '_' + getRnd() + '",' +
		'["visible"] = false,' +
		'["hidden"] = false,' +
		'["units"] = {#UNITS},' +
		'["task"] = {}' +
	'}';

	var defUnit = '{' +
		'["x"] = ' + _.get(groupObj, 'x') + ',' +
		'["y"] = ' + _.get(groupObj, 'y') + ',' +
		'["type"] = "AAV7",' +
		'["name"] = "' + _.get(groupObj, 'name') + '_' + getRnd() + '",' +
		'["unitId"] = ' + getRnd() + ',' +
		'["heading"] = 0,' +
		'["playerCanDrive"] = true,' +
		'["skill"] = "Excellent",' +
	'}';

	curGroup = defGndGroup;
	var curUnits = '';
	_.forEach(unitArry, function (unit, k) {
		var curUnitNum = k + 1;
		curUnits += '[' + curUnitNum + '] = ' + defUnit;
	});

	curGroup = _.replace(curGroup,"#UNITS",curUnits);
	return curGroup;
});
