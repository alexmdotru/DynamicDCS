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
var simpleStatEventSchema = require('../models/simpleStatEventSchema');
var cmdQueSchema = require('../models/cmdQueSchema');

exports.baseActions = function (action, serverName, obj){
	const Airfield = mapdb.model(serverName+'_airfield', airfieldSchema);
	if(action === 'update') {
		return new Promise(function(resolve, reject) {
			Airfield.update(
				{baseID: obj.baseID},
				{$set: {side: _.get(obj, 'side', 0)}},
				function(err, airfield) {
					if (err) { reject(err) }
					resolve(airfield);
				}
			);
		});
	}

	if(action === 'save') {
		return new Promise(function(resolve, reject) {
			Airfield.find({_id: obj._id}, function (err, airfieldObj) {
				if (err) {
					reject(err)
				}
				if (airfieldObj.length === 0) {
					const aObj = new Airfield(obj);
					aObj.save(function (err, afObj) {
						if (err) {
							reject(err)
						}
						resolve(afObj);
					});
				} else {
					Airfield.update(
						{_id: obj._id},
						{$set: {side: _.get(obj, 'side', 0)}},
						function(err, airfield) {
							if (err) { reject(err) }
							resolve(airfield);
						}
					);
				}
			});
		});
	}
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
				if (err) { reject(err) }
				resolve(srvPlayers);
			});
		});
	}
};

exports.unitActions = function (action, serverName, obj){
	const Unit = mapdb.model(serverName+'_unit', unitSchema);
	if (action === 'read') {
		return new Promise(function(resolve, reject) {
			Unit.find({obj}, function (err, dbUnits) {
				if (err) { reject(err) }
				resolve(dbUnits);
			});
		});
	}
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

	if (action === 'readLatest') {
		return new Promise(function(resolve, reject) {
			StatSession.findOne().sort({ field: 'asc', createdAt: -1 }).limit(1).exec(function (err, statSession) {
				if (err) { reject(err) }
				resolve(statSession);
			});
		});
	}
	if(action === 'update') {
		return new Promise(function(resolve, reject) {
			StatSession.update(
				{name: obj.name},
				{$set: obj},
				function(err, statsession) {
					if (err) { reject(err) }
					resolve(statsession);
				}
			);
		});
	}
	if(action === 'save') {
		return new Promise(function(resolve, reject) {
			StatSession.find({_id: obj._id}, function (err, sessionObj) {
				if (err) {
					reject(err)
				}
				if (sessionObj.length === 0) {
					const statsession = new StatSession(obj);
					statsession.save(function (err, statSession) {
						if (err) {
							reject(err)
						}
						resolve(statSession);
					});
				}
			});
		});
	}
};

exports.statSrvEventActions = function (action, serverName, obj){
	var newObjArray = [];
	const StatSrvEvent = mapdb.model(serverName+'_statSrvEvent', statSrvEventSchema);
	if (action === 'read') {
		return new Promise(function(resolve, reject) {
			StatSrvEvent.find({sessionName: _.get(obj, 'sessionName'), showInChart: true}, function (err, statSrvEvent) {
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

exports.simpleStatEventActions = function (action, serverName, obj){
	var newObjArray = [];
	const SimpleStatEvent = mapdb.model(serverName+'_simpleStatEvent', simpleStatEventSchema);
	if (action === 'read') {
		return new Promise(function(resolve, reject) {
			SimpleStatEvent.find({sessionName: _.get(obj, 'sessionName'), showInChart: true}, function (err, simpleStatEvent) {
				if (err) { reject(err) }
				resolve(simpleStatEvent);
			});
		});
	}
	if (action === 'readAll') {
		return new Promise(function(resolve, reject) {
			SimpleStatEvent.find(function (err, simpleStatEvent) {
				if (err) { reject(err) }
				resolve(simpleStatEvent);
			});
		});
	}
	if(action === 'save') {
		return new Promise(function(resolve, reject) {
			const simplestatevent = new SimpleStatEvent(obj);
			simplestatevent.save(function (err, simpleStatEvent) {
				if (err) { reject(err) }
				resolve(simpleStatEvent);
			});
		});
	}
};

exports.cmdQueActions = function (action, serverName, obj){
	const CmdQue = mapdb.model(serverName+'_cmdque', cmdQueSchema);
	if (action === 'grabNextQue') {
		return new Promise(function(resolve, reject) {
			CmdQue.findOneAndRemove({queName: obj.queName}, function (err,clientQue){
				if(err) {
					reject(err);
				}
				resolve(clientQue);
			});
		});
	}
	if(action === 'save') {
		return new Promise(function(resolve, reject) {
			const cmdque = new CmdQue(obj);
			cmdque.save(function (err, cmdque) {
				if (err) { reject(err) }
				resolve(cmdque);
			});
		});
	}
	if(action === 'delete') {
		return new Promise(function(resolve, reject) {
			CmdQue.findByIdAndRemove(obj._id, function (err, cmdque) {
				if (err) { reject(err) }
				resolve(cmdque);
			});
		});
	}
	if(action === 'dropall') {
		CmdQue.collection.drop();
	}
};
