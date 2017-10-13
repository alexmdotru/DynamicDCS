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

	curGroup = defGndGroup;
	var curUnits = '';
	_.forEach(unitArry, function (unit, k) {
		var curUnit = '{' +
			'["x"] = ' + _.get(unit, 'x') + ',' +
			'["y"] = ' + _.get(unit, 'y') + ',' +
			'["type"] = "AAV7",' +
			'["name"] = "' + _.get(unit, 'name') + '_' + getRnd() + '",' +
			'["unitId"] = ' + getRnd() + ',' +
			'["heading"] = 0,' +
			'["playerCanDrive"] = true,' +
			'["skill"] = "Excellent",' +
			'}';
		var curUnitNum = k + 1;
		curUnits +=  curUnit + ', ';
	});
	curGroup = _.replace(curGroup,"#UNITS",curUnits);
	return curGroup;
});
