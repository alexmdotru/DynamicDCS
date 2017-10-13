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
	/*
	var defGndUnit = {
		groupId: getRnd(),
		name: _.get(groupObj, 'name') + '_' + getRnd(),
		x: _.get(groupObj, 'x'),
		y: _.get(groupObj, 'y'),
		visible: false,
		hidden: false,
		task: "Ground Nothing",
		units: [],
		start_time: 0
		//route: {
		//	spans: {},
		//	points: []
		//},
		//tasks: {},
		//start_time: 0
	};
	var defRoute = {
		x: _.get(groupObj, 'x'),
		y: _.get(groupObj, 'y'),
		//alt: 1000,
		// alt: 'land.getHeight({["x"] = '+_.get(groupObj, 'x')+', ["y"] = '+_.get(groupObj, 'y')+'})',
		// alt: 'land.getHeight({x: '+_.get(groupObj, 'x')+', y: '+_.get(groupObj, 'y')+'})',
		// alt_type: "RADIO",
		name: _.get(groupObj, 'name') + '_' + getRnd()
		// type: 'Turning Point',
		// speed_locked: true,
		// formation_template: '',
		// ETA_locked: true,
		// speed: 0,
		// action: "Off Road",
		// ETA: 0,
		// task: {
		//	id: 'ComboTask',
		//	params: {
		//		tasks: {}
		//	},
		// }
	};
	var defUnit = {
		unitId: getRnd(),
		name: _.get(groupObj, 'name') + '_' + getRnd(),
		type: 'AAV7',
		x: _.get(groupObj, 'x'),
		y: _.get(groupObj, 'y'),
		skill: 'Excellent',
		playerCanDrive: true
		// heading: 0,
		// transportable: {
		// 	randomTransportable: false,
		// }
	};
	*/

	curGroup = defGndGroup;
	/*
		_.forEach(routeArry, function (route, k) {
			curGroup.route.points.push(defRoute);
		});
	*/
	var curUnits = '';
	_.forEach(unitArry, function (unit, k) {
		var curUnitNum = k + 1;
		curUnits += '[' + curUnitNum + '] = ' + defUnit;
	});

	curGroup = _.replace(curGroup,"#UNITS",curUnits);

	console.log('spwn: ', curGroup);

	var curCMD = 'coalition.addGroup(2, 3, ' + curGroup + ')';
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});
