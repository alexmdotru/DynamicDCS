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

exports.baseActions = function (action, serverName, obj){
	const Airfield = mapdb.model(serverName+'_airfield', airfieldSchema);
	var query = {_id: obj._id},
		update = { $set: obj },
		options = { upsert: true, new: true, setDefaultsOnInsert: true };

	Airfield.findOneAndUpdate( query, update, options, function(err) {
		if (err) return console.error(err);
	});
};

exports.srvPlayerActions = function (action, serverName, obj){
	const SrvPlayer = mapdb.model(serverName+'_srvPlayer', srvPlayerSchema);
	if (action === 'read') {
		return new Promise(function(resolve, reject) {
			SrvPlayer.find(function (err, srvPlayer) {
				if (err) { reject(err) }
				resolve(srvPlayer);
			});
		});
	}
	if (action === 'update') {
		curIP = obj.ipaddr;
		if(obj.ipaddr === ':10308' || obj.ipaddr === '::ffff:127.0.0.1'){
			curIP = '127.0.0.1';
		}
		_.set(obj, 'ipaddr', curIP);
		if(obj.side === 0){ //keep the user on the last side
			delete obj.side
		}
		var query = {_id: obj._id},
			update = {$set: obj},
			options = {upsert: true, new: true, setDefaultsOnInsert: true};
		SrvPlayer.findOneAndUpdate(query, update, options, function (err) {
			if (err) return console.error(err);
		});
	}
};

exports.unitActions = function (action, serverName, obj){
	const Unit = mapdb.model(serverName+'_unit', unitSchema);
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

