const 	net = require('net'),
		_ = require('lodash'),
		js2lua = require('js2lua');

const dbSystemServiceController = require('./dbSystemService');
const dbMapServiceController = require('./dbMapService');

// game mission commands
_.set(exports, 'sendMesgToAll', function (serverName, mesg, time) {
	var curCMD = 'trigger.action.outText("'+mesg+'", '+time+')';
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	// console.log('STA: ', serverName, actionObj);
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});

_.set(exports, 'sendMesgToCoalition', function (coalition, serverName, mesg, time) {
	var curCMD = 'trigger.action.outTextForCoalition('+coalition+', "'+mesg+'", '+time+')';
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	// console.log('SMTC: ', serverName, actionObj);
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});


// GameGui commands
_.set(exports, 'kickPlayer', function (serverName, playerId, mesg) {
	var curCMD = 'net.kick('+playerId+', "'+mesg+'")';
	//var curCMD = 'net.send_chat("'+mesg+'", all)';
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'GameGuiArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});

_.set(exports, 'forcePlayerSpectator', function (serverName, playerId, mesg) {
	var curCMD = 'net.force_player_slot('+playerId+', 0, "")';
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'GameGuiArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
	var curCMD = 'net.send_chat("'+mesg+'", all)';
	var actionObj = {actionObj: sendClient, queName: 'GameGuiArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});

_.set(exports, 'spawnGroupsInPolygon', function (serverName, baseName, pArray) {
	_.forEach(pArray, function (points, baseName) {
		if (_.isArray(points)) {
			var randVec2 = exports.getRandomVec2(points);
			console.log('POINT FOUND IN ZONE: ', baseName, randVec2);
			var curGrpObj = {
				x: randVec2.x,
				y: randVec2.y,
				name: baseName
			};
			exports.spawnGrndUnit(serverName, curGrpObj, [{}], [{}]);
		}
	});
});

_.set(exports, 'spawnGrndUnit', function (serverName, groupObj, routeArry, unitArry) {
	var curGroup = {};
	var getRnd = function () {
		return _.random(1000000,9000000);
	};
	var defGndUnit = {
		groupId: getRnd(),
		name: _.get(groupObj, 'name'),
		x: _.get(groupObj, 'x'),
		y: _.get(groupObj, 'y'),
		visible: false,
		hidden: false,
		task: "Ground Nothing",
		units: [],
		route: {
			spans: {},
			points: []
		},
		tasks: {},
		start_time: 0
	};
	var defRoute = {
		x: _.get(groupObj, 'x'),
		y: _.get(groupObj, 'y'),
		// alt: land.getHeight({x:_.get(groupObj, 'x'), y:_.get(groupObj, 'y')}),
		name: _.get(groupObj, 'name') + '_' + getRnd(),
		type: 'Turning Point',
		speed_locked: true,
		formation_template: '',
		ETA_locked: true,
		speed: 5.5555555555556,
		action: "Off Road",
		alt_type: "BARO",
		ETA: 0,
		task: {
			id: 'ComboTask',
			params: {
				tasks: {}
			},
		}
	};
	var defUnit = {
		unitId: getRnd(),
		name: _.get(groupObj, 'name') + '_' + getRnd(),
		type: 'AAV7',
		x: _.get(groupObj, 'x'),
		y: _.get(groupObj, 'y'),
		skill: 'Excellent',
		playerCanDrive: true,
		heading: 0,
		transportable: {
			randomTransportable: false,
		}
	};

	curGroup = _.cloneDeep(defGndUnit);

	_.forEach(routeArry, function (route, k) {
		curGroup.route.points.push(defRoute);
	});

	_.forEach(unitArry, function (unit, k) {
		curGroup.units.push(defUnit);
	});

	console.log('fullUnit: ', curGroup, curGroup.route.points);
	var curCMD = 'coalition.addGroup(2, 3, ' + js2lua.convert(curGroup) + ')';
	// var curCMD = 'trigger.action.outText("DERP", 5';
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});

_.set(exports, 'getBoundingSquare', function (pArray) {
	var x1 = pArray[0].x;
	var y1 = pArray[0].y;
	var x2 = pArray[0].x;
	var y2 = pArray[0].y;
	for (i = 1; i < pArray.length; i++) {
		x1 = ( x1 > pArray[i].x ) ? pArray[i].x : x1;
		x2 = ( x2 < pArray[i].x ) ? pArray[i].x : x2;
		y1 = ( y1 > pArray[i].y ) ? pArray[i].y : y1;
		y2 = ( y2 < pArray[i].y ) ? pArray[i].y : y2;
	}
	return {
		x1: x1,
		y1: y1,
		x2: x2,
		y2: y2
	}
});

_.set(exports, 'isVec2InZone', function (vec2, polyZone) {

	var Next;
	var Prev;
	var InPolygon = false;
	var pNum = polyZone.length - 1;

	Next = 1;
	Prev = pNum;

		while (Next <= pNum) {
			if ((( polyZone[Next].y > vec2.y ) !== ( polyZone[Prev].y > vec2.y )) &&
			( vec2.x < ( polyZone[Prev].x - polyZone[Next].x ) * ( vec2.y - polyZone[Next].y ) / ( polyZone[Prev].y - polyZone[Next].y ) + polyZone[Next].x )) {
				InPolygon = ! InPolygon;
			}
			Prev = Next;
			Next = Next + 1;
		}
	return InPolygon
});

_.set(exports, 'getRandomVec2', function (pArray) {
	var vec2Found = false;
	var vec2;
	var bs = exports.getBoundingSquare(pArray);

	while (!vec2Found) {
		vec2 = {
			x: _.random( bs.x1, bs.x2 ),
			y: _.random( bs.y1, bs.y2 )
		};

		// next step write function inVec2InZone
		if (exports.isVec2InZone( vec2, pArray )) {
			vec2Found = true;
		}
	}
	return vec2
});
