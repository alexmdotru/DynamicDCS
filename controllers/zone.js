const	_ = require('lodash');

const dbMapServiceController = require('./dbMapService');
const groupController = require('./group');

_.set(exports, 'getBoundingSquare', function (pArray) {
	var x1 = _.get(pArray, [0, 0]);
	var y1 = _.get(pArray, [0, 1]);
	var x2 = _.get(pArray, [0, 0]);
	var y2 = _.get(pArray, [0, 1]);
	for (i = 1; i < pArray.length; i++) {
		x1 = ( x1 > _.get(pArray, [i, 0])) ? _.get(pArray, [i, 0]) : x1;
		x2 = ( x2 < _.get(pArray, [i, 0])) ? _.get(pArray, [i, 0]) : x2;
		y1 = ( y1 > _.get(pArray, [i, 1])) ? _.get(pArray, [i, 1]) : y1;
		y2 = ( y2 < _.get(pArray, [i, 1]) ) ? _.get(pArray, [i, 1]) : y2;
	}
	return {
		x1: x1,
		y1: y1,
		x2: x2,
		y2: y2
	}
});

_.set(exports, 'isLatLonInZone', function (lonLat, polyZone) {

	var Next;
	var Prev;
	var InPolygon = false;
	var pNum = polyZone.length - 1;

	Next = 1;
	Prev = pNum;

	while (Next <= pNum) {
	if ((( polyZone[Next][1] > lonLat[1] ) !== ( polyZone[Prev][1] > lonLat[1] )) &&
		( lonLat[0] < ( polyZone[Prev][0] - polyZone[Next][0] ) * ( lonLat[1] - polyZone[Next][1] ) / ( polyZone[Prev][1] - polyZone[Next][1] ) + polyZone[Next][0] )) {
			InPolygon = ! InPolygon;
		}
		Prev = Next;
		Next = Next + 1;
	}
	return InPolygon
});

_.set(exports, 'getRandomLatLonFromBase', function (serverName, baseName) {
	var baseInfo = _.find(_.get(groupController, ['servers', serverName, 'bases']), {_id: baseName});
	var pArray = _.get(baseInfo, 'polygonLoc');
	if (pArray) {
		var lonLatFound = false;
		var lonLat;
		var bs = exports.getBoundingSquare(pArray);
		while (!lonLatFound) {
			lonLat = [
				_.random( bs.x1, bs.x2 ),
				_.random( bs.y1, bs.y2 )
			];
			if (exports.isLatLonInZone( lonLat, pArray )) {
				lonLatFound = true;
			}
		}
		return lonLat
	}
});
