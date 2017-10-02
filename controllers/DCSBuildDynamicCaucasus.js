const net = require('net'),
	_ = require('lodash');

const dbSystemServiceController = require('./dbSystemService');
const dbMapServiceController = require('./dbMapService');

_.set(exports, 'buildDynamicCaucasus', function () {
	console.log('build dynamic caucasus');
});
