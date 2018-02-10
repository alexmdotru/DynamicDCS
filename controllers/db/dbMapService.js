const mongoose = require('mongoose');
const _ = require('lodash');
const capLivesController = require('../action/capLives');

//changing promises to bluebird
mongoose.Promise = require('bluebird');
var mapdb = mongoose.createConnection();

var airfieldSchema = require('./models/airfieldSchema');
var srvPlayerSchema = require('./models/srvPlayerSchema');
var unitSchema = require('./models/unitSchema');
var statSessionSchema = require('./models/statSessionSchema');
var statSrvEventSchema = require('./models/statSrvEventSchema');
var simpleStatEventSchema = require('./models/simpleStatEventSchema');
var cmdQueSchema = require('./models/cmdQueSchema');
var webPushSchema = require('./models/webPushSchema');
var processSchema = require('./models/processSchema');

_.set(exports, 'connectMapDB', function (dynamicHost, dynamicDatabase) {
	mapdb.open(dynamicHost, dynamicDatabase);
});

exports.baseActions = function (action, serverName, obj){
	const Airfield = mapdb.model(serverName+'_airfield', airfieldSchema);
	if (action === 'read') {
		return new Promise(function(resolve, reject) {
			Airfield.find(obj, function (err, dbairfields) {
				if (err) { reject(err) }
				resolve(dbairfields);
			});
		});
	}
	if(action === 'getBaseSides') {
		var tAirfields;
		return new Promise(function(resolve, reject) {
			Airfield.find(
				{mainBase: true},
				function(err, dbairfields) {
					if (err) { reject(err) }
					tAirfields = _.transform(dbairfields, function (result, value) {
						result.push({name: value.name, side: value.side})
					}, []);
					resolve(tAirfields);
				}
			);
		});
	}
	if(action === 'updateSide') {
		return new Promise(function(resolve, reject) {
			Airfield.update(
				{_id: obj.name},
				{$set: {side: _.get(obj, 'side', 0)}},
				function(err, airfield) {
					if (err) { reject(err) }
					resolve(airfield);
				}
			);
		});
	}
	if(action === 'updateSpawnZones') {
		return new Promise(function(resolve, reject) {
			Airfield.update(
				{_id: obj.name},
				{$set: {spawnZones: _.get(obj, 'spawnZones', {})}},
				function(err, airfield) {
					if (err) { reject(err) }
					resolve(airfield);
				}
			);
		});
	}
	if(action === 'updateReplenTimer') {
		return new Promise(function(resolve, reject) {
			Airfield.update(
				{_id: obj.name},
				{$set: {replenTime: _.get(obj, 'replenTime')}},
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
			SrvPlayer.find(obj, function (err, srvPlayer) {
				if (err) { reject(err) }
				resolve(srvPlayer);
			});
		});
	}
	if (action === 'update') {
		return new Promise(function(resolve, reject) {
			SrvPlayer.find({_id: obj._id}, function (err, serverObj) {
				var curPly = _.get(serverObj, [0]);
				if (err) {
					reject(err)
				}
				if (serverObj.length === 0) {
					const sObj = new SrvPlayer(obj);
					sObj.capLifeLastAdded = new Date().getTime();
					sObj.curCapLives = capLivesController.defaultLife;
					curIP = sObj.ipaddr;
					if(sObj.ipaddr === ':10308' || sObj.ipaddr === '127.0.0.1'){
						curIP = '127.0.0.1';
					}
					_.set(sObj, 'ipaddr', curIP);
					if(sObj.side === 0){ //keep the user on the last side
						delete sObj.side
					}
					sObj.save(function (err, serObj) {
						if (err) {
							reject(err)
						}
						resolve(serObj);
					});
				} else {
					if (curPly.sessionName !== obj.sessionName) {
						obj.capLifeLastAdded = new Date().getTime();
						obj.curCapLives = capLivesController.defaultLife;
					}
					curIP = obj.ipaddr;
					if(obj.ipaddr === ':10308' || obj.ipaddr === '127.0.0.1'){
						curIP = '127.0.0.1';
					}
					_.set(obj, 'ipaddr', curIP);
					if(obj.side === 0){ //keep the user on the last side
						delete obj.side
					}
					SrvPlayer.update(
						{_id: obj._id},
						{$set: obj},
						function(err, serObj) {
							if (err) { reject(err) }
							resolve(serObj);
						}
					);
				}
			});
		});
	}

	if (action === 'autoAddLife') {
		return new Promise(function(resolve, reject) {
			SrvPlayer.find({_id: obj._id}, function (err, serverObj) {
				var curPly = _.get(serverObj, [0]);
				if (err) {
					reject(err)
				}
				if (serverObj.length !== 0) {
					var curLife = _.get(curPly, ['curCapLives'], 0) + 1;
					if (curLife > capLivesController.defaultLife) {
						curLife = capLivesController.defaultLife;
					}
					SrvPlayer.findOneAndUpdate(
						{_id: obj._id},
						{$set: {curCapLives: curLife, capLifeLastAdded: new Date()}},
						function(err, srvPlayer) {
							if (err) { reject(err) }
							resolve(srvPlayer);
						}
					);
				}
			});
		})
	}

	if (action === 'removeLife') {
		return new Promise(function(resolve, reject) {
			SrvPlayer.find({_id: obj._id}, function (err, serverObj) {
				var curPly = _.get(serverObj, [0]);
				if (err) {
					reject(err)
				}
				if (serverObj.length !== 0) {
					var curLife = _.get(curPly, ['curCapLives'], 1) - 1;
					SrvPlayer.update(
						{_id: obj._id},
						{$set: {curCapLives: curLife}},
						function(err) {
							if (err) { reject(err) }
							resolve(curLife);
						}
					);
				}
			});
		})
	}
};

exports.unitActions = function (action, serverName, obj){
	const Unit = mapdb.model(serverName+'_unit', unitSchema);
	if (action === 'read') {
		return new Promise(function(resolve, reject) {
			Unit.find(obj).sort( { createdAt: -1 } ).exec(function (err, dbUnits) {
				if (err) { reject(err) }
				resolve(dbUnits);
			});
		});
	}
	if (action === 'readStd') {
		return new Promise(function(resolve, reject) {
			Unit.find(obj).exec(function (err, dbUnits) {
				if (err) { reject(err) }
				resolve(dbUnits);
			});
		});
	}
	if (action === 'readGeo') {
		return new Promise(function(resolve, reject) {
			Unit.find(obj).exec(function (err, dbUnits) {
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
			Unit.findOneAndUpdate(
				{_id: obj._id},
				{$set: obj},
				function(err, units) {
					if (err) { reject(err) }
					resolve(units);
				}
			);
		});
	}
	if(action === 'updateByName') {
		return new Promise(function(resolve, reject) {
			Unit.findOneAndUpdate(
				{name: obj.name},
				{$set: obj},
				function(err, units) {
					if (err) { reject(err) }
					resolve(units);
				}
			);
		});
	}
	if(action === 'updateByUnitId') {
		return new Promise(function(resolve, reject) {
			Unit.findOneAndUpdate(
				{unitId: obj.unitId},
				{$set: obj},
				function(err, units) {
					if (err) { reject(err) }
					resolve(units);
				}
			);
		});
	}
	if(action === 'chkResync') {
		return new Promise(function(resolve, reject) {
			Unit.updateMany(
				{},
				{$set: {isResync: false}},
				function(err, units) {
					if (err) { reject(err) }
					resolve(units);
				}
			);
		});
	}
	if(action === 'markUndead') {
		return new Promise(function(resolve, reject) {
			Unit.updateMany(
				{isResync: false},
				{$set: {dead: true}},
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

/*
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
*/

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
	if(action === 'removeall') {
		return CmdQue.remove({});
	}
	if(action === 'dropall') {
		return CmdQue.collection.drop();
	}
};

exports.webPushActions = function (action, serverName, obj){
	const WebPush = mapdb.model(serverName+'_webpush', webPushSchema);
	if (action === 'grabNextQue') {
		return new Promise(function(resolve, reject) {
			WebPush.findOneAndRemove({serverName: serverName}, function (err, wpush){
				if(err) {
					reject(err);
				}
				resolve(wpush);
			});
		});
	}
	if(action === 'save') {
		return new Promise(function(resolve, reject) {
			console.log('sp: ', obj);
			const webpush = new WebPush(obj);
			webpush.save(function (err, wpush) {
				if (err) { reject(err) }
				resolve(wpush);
			});
		});
	}
	if(action === 'delete') {
		return new Promise(function(resolve, reject) {
			WebPush.findByIdAndRemove(obj._id, function (err, wpush) {
				if (err) { reject(err) }
				resolve(wpush);
			});
		});
	}
	if(action === 'removeall') {
		return WebPush.remove({});
	}
	if(action === 'dropall') {
		return WebPush.collection.drop();
	}
};

exports.processActions = function (action, serverName, obj){
	const ProcessQue = mapdb.model(serverName+'_processque', processSchema);
	if (action === 'read') {
		return new Promise(function(resolve, reject) {
			ProcessQue.find(obj, function (err, pQue){
				if(err) {
					reject(err);
				}
				resolve(pQue);
			});
		});
	}
	if (action === 'processExpired') {
		return new Promise(function(resolve, reject) {
			ProcessQue.findAndModify(
				{ firingTime: { $lt: new Date() } },
				{ firingTime: 1 },
				{},
				{ remove: true },
				function (err, pQue){
				if(err) {
					reject(err);
				}
				resolve(pQue.value);
			});
		});
	}
	if(action === 'update') {
		return new Promise(function(resolve, reject) {
			ProcessQue.update(
				{_id: obj._id},
				{$set: obj},
				function(err, pQue) {
					if (err) { reject(err) }
					resolve(pQue);
				}
			);
		});
	}
	if(action === 'save') {
		return new Promise(function(resolve, reject) {
			const processque = new ProcessQue(obj);
			processque.save(function (err, pQue) {
				if (err) { reject(err) }
				resolve(pQue);
			});
		});
	}
	if(action === 'delete') {
		return new Promise(function(resolve, reject) {
			ProcessQue.findByIdAndRemove(obj._id, function (err, pQue) {
				if (err) { reject(err) }
				resolve(pQue);
			});
		});
	}
	if(action === 'dropall') {
		ProcessQue.collection.drop();
	}
};


