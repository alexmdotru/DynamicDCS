const	_ = require('lodash');

const dbMapServiceController = require('./dbMapService');
const groupController = require('./group');

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

_.set(exports, 'getRandomVec2FromBase', function (serverName, baseName) {
	var baseInfo = _.find(_.get(groupController, ['servers', serverName, 'bases']), {_id: baseName});
	var pArray = _.get(baseInfo, 'spawnZones');
	if (pArray) {
		var vec2Found = false;
		var vec2;
		var bs = exports.getBoundingSquare(pArray);
		while (!vec2Found) {
			vec2 = {
				x: _.random( bs.x1, bs.x2 ),
				y: _.random( bs.y1, bs.y2 )
			};
			if (exports.isVec2InZone( vec2, pArray )) {
				vec2Found = true;
			}
		}
		return vec2
	}
});
