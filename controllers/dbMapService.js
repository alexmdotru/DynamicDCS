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
var statSessionSchema = require('../models/statSessionSchema');
var statSrvEventSchema = require('../models/statSrvEventSchema');

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
	//console.log('srvPlayerActions: ', action, serverName, obj);
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
		return new Promise(function(resolve, reject) {
			curIP = obj.ipaddr;
			if(obj.ipaddr === ':10308' || obj.ipaddr === '127.0.0.1'){
				curIP = '127.0.0.1';
			}
			_.set(obj, 'ipaddr', curIP);
			if(obj.side === 0){ //keep the user on the last side
				delete obj.side
			}
			var query = {_id: obj._id},
				update = {$set: obj},
				options = {upsert: true, new: true, setDefaultsOnInsert: true};
			SrvPlayer.findOneAndUpdate(query, update, options, function (err, srvPlayers) {
				if (err) { reject('DERPY: '+err) }
				resolve(srvPlayers);
			});
		});
	}
};

exports.unitActions = function (action, serverName, obj){
	const Unit = mapdb.model(serverName+'_unit', unitSchema);
	if(action === 'save') {
		return new Promise(function(resolve, reject) {
			const unit = new Unit(obj);
			unit.save(function (err, units) {
				if (err) { reject(err) }
				resolve(units);
			});
		});
	}
	if(action === 'update') {
		return new Promise(function(resolve, reject) {
			Unit.update(
				{_id: obj._id},
				{$set: obj},
				function(err, units) {
					if (err) { reject(err) }
					resolve(units);
				}
			);
		});
	}
	if(action === 'delete') {
		return new Promise(function(resolve, reject) {
			Unit.findByIdAndRemove(obj._id, function (err, units) {
				if (err) { reject(err) }
				resolve(units);
			});
		});
	}
	if(action === 'dropall') {
		Unit.collection.drop();
	}
};

exports.statSessionActions = function (action, serverName, obj){
	const StatSession = mapdb.model(serverName+'_statSession', statSessionSchema);
	if (action === 'read') {
		return new Promise(function(resolve, reject) {
			StatSession.find(function (err, statSession) {
				if (err) { reject(err) }
				resolve(statSession);
			});
		});
	}
	if(action === 'save') {
		return new Promise(function(resolve, reject) {
			const statsession = new StatSession(obj);
			statsession.save(function (err, statSession) {
				if (err) { reject(err) }
				resolve(statSession);
			});
		});
	}
};

exports.statSrvEventActions = function (action, serverName, obj){
	const StatSrvEvent = mapdb.model(serverName+'_statSrvEvent', statSrvEventSchema);
	console.log(obj);
	if (action === 'read') {
		return new Promise(function(resolve, reject) {
			StatSrvEvent.find({sessionName: obj}, function (err, statSrvEvent) {
				if (err) { reject(err) }
				resolve(statSrvEvent);
			});
		});
	}
	if (action === 'readAll') {
		return new Promise(function(resolve, reject) {
			StatSrvEvent.find(function (err, statSrvEvent) {
				if (err) { reject(err) }
				resolve(statSrvEvent);
			});
		});
	}
	if(action === 'save') {
		return new Promise(function(resolve, reject) {
			const statsrvevent = new StatSrvEvent(obj);
			statsrvevent.save(function (err, statSrvEvent) {
				if (err) { reject(err) }
				resolve(statSrvEvent);
			});
		});
	}
};
