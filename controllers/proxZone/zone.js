const	_ = require('lodash');
const constants = require('../constants');

/**
 * Calculate a new coordinate based on start, distance and bearing
 *
 * @param start array - start coordinate as decimal lat/lon pair
 * @param dist  float - distance in kilometers
 * @param brng  float - bearing in degrees (compass direction)
 */
_.set(Math, 'fmod', function (a,b) { return Number((a - (Math.floor(a / b) * b)).toPrecision(8)); });

function geo_destination(lonLat, dist, brng){
	lon1 = toRad(lonLat[0]);
	lat1 = toRad(lonLat[1]);
	dist = dist/6371.01; //Earth's radius in km
	brng = toRad(brng);

	lat2 = Math.asin( Math.sin(lat1)* Math.cos(dist) +
		Math.cos(lat1) * Math.sin(dist) * Math.cos(brng) );
	lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(dist) * Math.cos(lat1),
			Math.cos(dist) - Math.sin(lat1) * Math.sin(lat2));
	lon2 = Math.fmod((lon2 + 3 * Math.PI),(2 * Math.PI)) - Math.PI;

	return [toDeg(lon2), toDeg(lat2)];
}
function toRad(deg){
	return deg * Math.PI / 180;
}
function toDeg(rad){
	return rad * 180 / Math.PI;
}

_.set(exports, 'findBearing', function(lat1, lng1, lat2, lng2) {
	var dLon = (lng2-lng1);
	var y = Math.sin(dLon) * Math.cos(lat2);
	var x = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
	var brng = (Math.atan2(y, x)) * 180 / Math.PI;
	var curDeg = 360 - ((brng + 360) % 360);
	return (curDeg == 360) ? 0 : curDeg;
});

_.set(exports, 'getLonLatFromDistanceDirection', function (lonLatLoc, direction, distance) {
	return geo_destination(lonLatLoc, distance, direction);
});

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
	var baseInfo = _.find(_.get(constants, 'bases'), {_id: baseName});
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
