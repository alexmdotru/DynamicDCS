const	_ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');

_.set(exports, 'processStaticCrate', function (serverName, crateObj) {
	var cPromise = [];
	console.log('CO: ', crateObj);
	_.forEach(_.get(crateObj, 'data', {}), function (crate, name) {
		if(crate.alive) {
			cPromise.push(dbMapServiceController.staticCrateActions('update', serverName, {id: name, lonLatLoc: [crate.lon, crate.lat]}));
		} else {
			cPromise.push(dbMapServiceController.staticCrateActions('delete', serverName, {id: name}));
		}
	});
	Promise.all(cPromise)
		.then(function () {
			if(crateObj.callback === 'unpackCrate') {
				exports.unpackCrate();
			}
		})
		.catch(function (err) {
			console.log('erroring line35: ', err);
		})
	;
});

_.set(exports, 'unpackCrate', function () {
	//find proxmity, grab closest, spawn and delete if over allocation
	console.log('RAN UNPACK CRATE');
});
