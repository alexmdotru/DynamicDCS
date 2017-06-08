const mongoose = require('mongoose'),
	_ = require('lodash'),
	dbConfig = require('../config/db');

//changing promises to bluebird
mongoose.Promise = require('bluebird');
mongoose.connect(dbConfig.database);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
	console.log('connected to mongodb');
});

// include mongoose db schemas
const Airfield = require('../models/airfield');
const SrvPlayer = require('../models/srvPlayer');
const Unit = require('../models/unit');


exports.baseActions = function (action, obj){
	var query = {_id: obj._id},
		update = { $set: obj },
		options = { upsert: true, new: true, setDefaultsOnInsert: true };

	Airfield.findOneAndUpdate( query, update, options, function(err) {
		if (err) return console.error(err);
	});
};

exports.srcPlayerActions = function (action, obj){
	var query = {_id: obj._id},
		update = { $set: obj },
		options = { upsert: true, new: true, setDefaultsOnInsert: true };

	SrvPlayer.findOneAndUpdate( query, update, options, function(err) {
		if (err) return console.error(err);
	});
};

exports.unitActions = function (action, obj){
	if(action === 'save') {
		const unit = new Unit(obj);
		unit.save(function (err) {
			if (err) return console.error(err);
		});
	}

	if(action === 'update') {
		Unit.update(
			{_id: obj._id},
			{$set: obj} ,
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
		mongoose.connection.db.dropCollection('units');
	}
};

