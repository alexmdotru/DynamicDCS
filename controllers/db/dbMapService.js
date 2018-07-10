const mongoose = require('mongoose');
const _ = require('lodash');
const constants = require('../constants');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const groupController = require('../spawn/group');

//changing promises to bluebird
mongoose.Promise = require('bluebird');
var mapdb = mongoose.createConnection();

var airfieldSchema = require('./models/airfieldSchema');
var srvPlayerSchema = require('./models/srvPlayerSchema');
var unitSchema = require('./models/unitSchema');
var staticCratesSchema = require('./models/staticCratesSchema');
var statSessionSchema = require('./models/statSessionSchema');
var statSrvEventSchema = require('./models/statSrvEventSchema');
var simpleStatEventSchema = require('./models/simpleStatEventSchema');
var cmdQueSchema = require('./models/cmdQueSchema');
var webPushSchema = require('./models/webPushSchema');
var processSchema = require('./models/processSchema');

var fifteenSecs = 15 * 1000;
var oneMin = 60 * 1000;
var oneHour = 60 * oneMin;
var removeDead = 5 * oneMin;

var maxLifePoints = 18;

_.set(exports, 'connectMapDB', function (host, database) {
	mapdb.open(host, database);
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
	if(action === 'getClosestBase') {
		return new Promise(function(resolve, reject) {
			Airfield.find(
				{
					mainBase: true,
					centerLoc: {
						$near: {
							$geometry: {
								type: "Point",
								coordinates: obj.unitLonLatLoc
							}
						}
					}
				},
				function(err, dbairfields) {
					if (err) { reject(err) }
					resolve(_.first(dbairfields));
				}
			);
		});
	}
	if(action === 'getClosestFriendlyBase') {
		return new Promise(function(resolve, reject) {
			Airfield.find(
				{
					mainBase: true,
					side: obj.playerSide,
					centerLoc: {
						$near: {
							$geometry: {
								type: "Point",
								coordinates: obj.unitLonLatLoc
							}
						}
					}
				},
				function(err, dbairfields) {
					if (err) { reject(err) }
					resolve(_.first(dbairfields));
				}
			);
		});
	}
	if(action === 'getClosestEnemyBase') {
		return new Promise(function(resolve, reject) {
			Airfield.find(
				{
					mainBase: true,
					side: constants.enemyCountry[obj.playerSide],
					centerLoc: {
						$near: {
							$geometry: {
								type: "Point",
								coordinates: obj.unitLonLatLoc
							}
						}
					}
				},
				function(err, dbairfields) {
					if (err) { reject(err) }
					resolve(_.first(dbairfields));
				}
			);
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
				{$set: {side: _.get(obj, 'side', 0), replenTime: new Date()}},
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
	var nowTime = new Date().getTime();
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
			SrvPlayer.update(
				{_id: obj._id},
				{$set: obj},
				function(err, serObj) {
					if (err) { reject(err) }
					resolve(serObj);
				}
			);
		});
	}

	if (action === 'updateFromServer') {
		return new Promise(function(resolve, reject) {
			SrvPlayer.find({_id: obj._id}, function (err, serverObj) {
				var curPly = _.get(serverObj, [0]);
				if (err) {
					reject(err)
				}
				if (serverObj.length === 0) {
					const sObj = new SrvPlayer(obj);
					curIP = sObj.ipaddr;
					if(sObj.ipaddr === ':10308' || sObj.ipaddr === '127.0.0.1'){
						curIP = '127.0.0.1';
					}
					_.set(sObj, 'ipaddr', curIP);
					if(sObj.side === 0){ //keep the user on the last side
						delete sObj.side
					}
					sObj.curLifePoints = _.get(groupController, 'config.startLifePoints', 0);
					sObj.save(function (err, serObj) {
						if (err) {
							reject(err)
						}
						resolve(serObj);
					});
				} else {
					// console.log('sess: ', curPly.sessionName, obj.sessionName);
					if ((curPly.sessionName !== obj.sessionName) && curPly.sessionName && obj.sessionName) {
						var curTime =  new Date().getTime();
						// console.log('cf: ', groupController);
						obj.curLifePoints = _.get(groupController, 'config.startLifePoints', 0);
						if (curPly.sideLockTime < curTime) {
							obj.sideLockTime = curTime + oneHour;
							obj.sideLock = 0;
						}
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

	if (action === 'addLifePoints') {
		return new Promise(function(resolve, reject) {
			SrvPlayer.find({_id: obj._id}, function (err, serverObj) {
				var curAction = 'addLifePoint';
				var curPlayerLifePoints = _.get(serverObj, [0, 'curLifePoints'], 0);
				var curTotalPoints = (curPlayerLifePoints >= 0) ? curPlayerLifePoints + obj.addLifePoints : obj.addLifePoints;
				var msg;
				if (err) {
					reject(err)
				}
				if (serverObj.length > 0) {
					SrvPlayer.findOneAndUpdate(
						{_id: obj._id},
						{ $set: {
							curLifePoints: (curTotalPoints > maxLifePoints) ? maxLifePoints : curTotalPoints,
							lastLifeAction: curAction,
							safeLifeActionTime: (nowTime + fifteenSecs)
						}
						},
						function(err, srvPlayer) {
							if (err) { reject(err) }
							if (obj.execAction === 'PeriodicAdd') {
								msg = '+' + _.round(obj.addLifePoints, 2).toFixed(2) + 'LP(T:' + curTotalPoints.toFixed(2) + ')';
							} else {
								msg = 'You Have Just Gained ' + obj.addLifePoints.toFixed(2) + ' Life Points! ' + obj.execAction + '(Total:' + curTotalPoints.toFixed(2) + ')'
							}
							if (obj.groupId) {
								DCSLuaCommands.sendMesgToGroup( obj.groupId, serverName, msg, 5);
							}
							resolve(srvPlayer);
						}
					)
				} else {
					resolve('line276: Error: No Record in player db' + obj._id);
				}
			});
		})
	}

	if (action === 'removeLifePoints') {
		return new Promise(function(resolve, reject) {
			SrvPlayer.find({_id: obj._id}, function (err, serverObj) {
				var curAction = 'removeLifePoint';
				var curPlayerObj = _.first(serverObj);
				var curPlayerLifePoints = _.get(curPlayerObj, 'curLifePoints', 0);
				var curTotalPoints = curPlayerLifePoints - obj.removeLifePoints;
				if (err) {
					reject(err)
				}
				// console.log('removeP: ', curTotalPoints, curPlayerObj, serverObj, obj);
				if (serverObj.length > 0) {
					if (curTotalPoints < 0) {
						console.log('Removed ' + curPlayerObj.name + ' from aircraft for not enough points');
						DCSLuaCommands.forcePlayerSpectator(
							serverName,
							curPlayerObj.playerId,
							'You Do Not Have Enough Points To Fly This Vehicle' +
							'{' + obj.removeLifePoints.toFixed(2) + '/' + curPlayerLifePoints.toFixed(2) + ')'
						);
						resolve(serverObj);
					} else {
						SrvPlayer.findOneAndUpdate(
							{_id: obj._id},
							{ $set: {
								curLifePoints: curTotalPoints,
								lastLifeAction: curAction,
								safeLifeActionTime: (nowTime + fifteenSecs)
							}},
							function(err, srvPlayer) {
								if (err) { reject(err) }
								DCSLuaCommands.sendMesgToGroup( obj.groupId, serverName, 'You Have Just Used ' + obj.removeLifePoints.toFixed(2) + ' Life Points! ' + obj.execAction + '(Total:' + curTotalPoints.toFixed(2) + ')', 5);
								resolve(srvPlayer);
							}
						)
					}
				} else {
					resolve('line305: Error: No Record in player db:' + obj._id);
				}
			});
		})
	}

	if (action === 'clearTempScore') {
		return new Promise(function(resolve, reject) {
			// console.log('clearTempScore: ', obj);
			SrvPlayer.find({_id: obj._id}, function (err, serverObj) {
				if (err) { reject(err) }
				if (serverObj.length !== 0) {
					var curPly = _.get(serverObj, [0]);
					var newTmpScore = 0;
					SrvPlayer.update(
						{_id: obj._id},
						{$set: {tmpRSPoints: newTmpScore}},
						function(err) {
							if (err) { reject(err) }
							// console.log(_.get(curPly, 'name'), ' Has Tmp Score(cleared)');
							var mesg = 'Your Tmp Score Has Been Cleared';
							DCSLuaCommands.sendMesgToGroup(obj.groupId, serverName, mesg, '15');
							resolve();
						}
					);
				}
			});
		})
	}
	if (action === 'addTempScore') {
		return new Promise(function(resolve, reject) {
			// console.log('addTempScore: ', obj);
			SrvPlayer.find({_id: obj._id}, function (err, serverObj) {
				if (err) { reject(err) }
				if (serverObj.length !== 0) {
					var curPly = _.get(serverObj, [0]);
					var newTmpScore = _.get(curPly, 'tmpRSPoints', 0) + _.get(obj, 'score', 0);
					SrvPlayer.update(
						{_id: obj._id},
						{$set: {tmpRSPoints: newTmpScore}},
						function(err) {
							if (err) { reject(err) }
							// console.log(_.get(curPly, 'name'), ' Has Tmp Score: ', newTmpScore);
							var mesg = 'TmpScore: ' + newTmpScore + ', Land at a friendly base/farp to receive these points';
							if (_.get(groupController, 'config.inGameHitMessages', true)) {
								DCSLuaCommands.sendMesgToGroup(obj.groupId, serverName, mesg, '15');
							}
							resolve();
						}
					);
				}
			});
		})
	}
	if (action === 'applyTempToRealScore') {
		return new Promise(function(resolve, reject) {
			// console.log('applyTempToRealScore: ', obj);
			SrvPlayer.find({_id: obj._id}, function (err, serverObj) {
				var mesg;
				if (err) { reject(err) }
				if (serverObj.length !== 0) {
					var curPly = _.get(serverObj, [0]);
					var rsTotals = {
						redRSPoints: _.get(curPly, 'redRSPoints', 0),
						blueRSPoints: _.get(curPly, 'blueRSPoints', 0),
						tmpRSPoints: _.get(curPly, 'tmpRSPoints', 0)
					};
					if (curPly.side === 1) {
						_.set(rsTotals, 'redRSPoints', rsTotals.redRSPoints + rsTotals.tmpRSPoints);
						mesg = 'You have been awarded: ' + rsTotals.tmpRSPoints + ' Points, Total Red RS Points: ' + rsTotals.redRSPoints;
						_.set(rsTotals, 'tmpRSPoints', 0);
					}
					if (curPly.side === 2) {
						_.set(rsTotals, 'blueRSPoints', rsTotals.blueRSPoints + rsTotals.tmpRSPoints);
						mesg = 'You have been awarded: ' + rsTotals.tmpRSPoints + ' Points, Total Blue RS Points: ' + rsTotals.blueRSPoints;
						_.set(rsTotals, 'tmpRSPoints', 0);
					}
					// console.log('APLY2: ', _.get(curPly, 'name'), rsTotals, mesg);
					SrvPlayer.update(
						{_id: obj._id},
						{$set: rsTotals},
						function(err) {
							if (err) { reject(err) }
							console.log('aplyT2R: ', _.get(curPly, 'name'), mesg);
							DCSLuaCommands.sendMesgToGroup(obj.groupId, serverName, mesg, '15');
							resolve();
						}
					);
				}
			});
		})
	}
	if (action === 'unitAddToRealScore') {
		return new Promise(function(resolve, reject) {
			if (obj._id) {
				SrvPlayer.find({_id: obj._id}, function (err, serverObj) {
					if (err) { reject(err) }
					if (serverObj.length !== 0) {
						var mesg;
						var curPly = _.get(serverObj, [0]);
						var addScore = _.get(obj, 'score', 0);
						var curType = _.get(obj, 'unitType', '');
						var tObj = {};
						// unit has to be on the same side as player and not be a troop
						if (_.get(obj, 'unitCoalition') === curPly.side) {
							if (curPly.side === 1) {
								mesg = 'You have been awarded ' + addScore + ' from your ' + curType + ' for red';
								_.set(tObj, 'redRSPoints', _.get(curPly, ['redRSPoints'], 0) + addScore);
							}
							if (curPly.side === 2) {
								mesg = 'You have been awarded ' + addScore + ' from your ' + curType + ' for blue';
								_.set(tObj, 'blueRSPoints', _.get(curPly, ['blueRSPoints'], 0) + addScore);
							}
							SrvPlayer.update(
								{_id: obj._id},
								{$set: tObj},
								function(err) {
									if (err) { reject(err) }
									console.log(_.get(obj, 'unitType', '') + ' has given ' + addScore + ' to ' + _.get(curPly, 'name') + ' on ' + curPly.side + ', Total: ', tObj);
									if (_.get(groupController, 'config.inGameHitMessages', true)) {
										DCSLuaCommands.sendMesgToGroup(obj.groupId, serverName, mesg, '15');
									}
									resolve();
								}
							);
						}
					}
				});
			}
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
	if(action === 'removeAllDead') {
		return new Promise(function(resolve, reject) {
			var fiveMinsAgo = new Date(new Date()).getTime() - removeDead;
			// console.log('five mins: ', fiveMinsAgo);
			Unit.remove(
				{
					dead: true,
					category: {
						$ne: 'STRUCTURE'
					},
					updatedAt: {
						$lte: fiveMinsAgo
					}
				},
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

exports.staticCrateActions = function (action, serverName, obj){
	const StaticCrates = mapdb.model(serverName+'_crate', staticCratesSchema);
	if (action === 'read') {
		return new Promise(function(resolve, reject) {
			StaticCrates.find(obj).sort( { createdAt: -1 } ).exec(function (err, dbUnits) {
				if (err) { reject(err) }
				resolve(dbUnits);
			});
		});
	}
	if (action === 'readStd') {
		return new Promise(function(resolve, reject) {
			StaticCrates.find(obj).exec(function (err, dbUnits) {
				if (err) { reject(err) }
				resolve(dbUnits);
			});
		});
	}
	if(action === 'save') {
		return new Promise(function(resolve, reject) {
			const crate = new StaticCrates(obj);
			crate.save(function (err, units) {
				if (err) { reject(err) }
				resolve(units);
			});
		});
	}
	if(action === 'update') {
		return new Promise(function(resolve, reject) {
			StaticCrates.findOneAndUpdate(
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
			StaticCrates.findOneAndUpdate(
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
			StaticCrates.findOneAndUpdate(
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
			StaticCrates.updateMany(
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
			StaticCrates.updateMany(
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
			StaticCrates.findByIdAndRemove(obj._id, function (err, units) {
				if (err) { reject(err) }
				resolve(units);
			});
		});
	}
	if(action === 'dropall') {
		StaticCrates.collection.drop();
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


