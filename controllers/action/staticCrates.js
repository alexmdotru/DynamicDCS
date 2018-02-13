const	_ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');

_.set(exports, 'processStaticCrate', function (crateObj) {
	_.forEach(_.get(crateObj, 'data', {}), function (crate, name) {
		if(crate.alive) {
			if (lat > 0) {

			}
			if (lon > 0) {

			}
		}
	});

	if(crateObj.callback === 'unpackCrate') {
		exports.unpackCrate(crateObj);
	}
});

_.set(exports, 'unpackCrate', function (crateObj) {

});
