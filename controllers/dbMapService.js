const mongoose = require('mongoose'),
	_ = require('lodash'),
	dbConfig = require('../config/db');

//changing promises to bluebird
mongoose.Promise = require('bluebird');

var mapdb = mongoose.createConnection();
mapdb.open(dbConfig.dynamicHost, dbConfig.dynamicDatabase);

var airfieldSchema = require('../models/airfieldSchema');
var srvPlayerSchema = require('../models/srvPlayerSchema');
var unitSchema = require('../models/unitSchema');

exports.baseActions = function (action, obj){
	const Airfield = mapdb.model('airfield', airfieldSchema);
	var query = {_id: obj._id},
		update = { $set: obj },
		options = { upsert: true, new: true, setDefaultsOnInsert: true };

	Airfield.findOneAndUpdate( query, update, options, function(err) {
		if (err) return console.error(err);
	});
};

exports.srcPlayerActions = function (action, obj){
	const SrvPlayer = mapdb.model('srvPlayer', srvPlayerSchema);
	var query = {_id: obj._id},
		update = { $set: obj },
		options = { upsert: true, new: true, setDefaultsOnInsert: true };

	SrvPlayer.findOneAndUpdate( query, update, options, function(err) {
		if (err) return console.error(err);
	});
};

exports.unitActions = function (action, obj){
	const Unit = mapdb.model('unit', unitSchema);
	if(action === 'save') {
		const unit = new Unit(obj);
		unit.save(function (err) {
			if (err) return console.error(err);
		});
	}
	if(action === 'update') {
		Unit.update(
			{_id: obj._id},
			{$set: obj},
			function(err) {
				if (err) return console.error(err);
			}
		);
	}
	if(action === 'delete') {
		Unit.findByIdAndRemove(obj._id, function (err) {
			if (err) return console.error(err);
		});
	}
	if(action === 'dropall') {
		Unit.collection.drop();
	}
};

