const	_ = require('lodash');

const dbMapServiceController = require('./dbMapService');
const groupController = require('./group');

_.set(exports, 'menuCmdProcess', function (processObj) {
	console.log('process menu cmd: ', processObj);
});
