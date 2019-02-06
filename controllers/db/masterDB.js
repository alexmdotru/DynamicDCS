const _ = require('lodash');
const constants = require('../constants');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const Mongoose = require('mongoose');
Mongoose.Promise = require('bluebird');
var curDBMaster;
var masterDBName = 'DDCS';
var normalizedPath = require("path").join(__dirname, "models");
var fs = require('fs');
fs.readFileAsync = function() {
	return new Promise(function(resolve, reject) {
		fs.readFile(__dirname + '/../../.config.json', function(err, data){
			if (err) {
				reject(err);
			} else {
				_.set(exports, 'initConfig', JSON.parse(data));
				resolve(JSON.parse(data));
			}
		});
	});
};

fs.readdirSync(normalizedPath).forEach(function(file) {
	_.set(exports, ['dbObj', _.first( _.split(file, '.'))], require("./models/" + file));
});

_.assign(exports, {
	connectDB: function (host, database) {
		return new Promise(function(resolve, reject) {
			fs.readFileAsync()
				.then(function (reply) {
					// console.log('READ FILE: ', reply.DB.user);
					console.log('const: ', exports.initConfig);
					var connString = 'mongodb://' + _.get(exports, ['initConfig', 'DB', 'user']) + ':' + _.get(exports, ['initConfig', 'DB', 'password']) +'@' + host + ':27017/' + database + '?authSource=admin';
					// console.log('CS: ', connString);
					_.set(exports, ['dbObj', 'dbConn', database], Mongoose.createConnection(connString, { useNewUrlParser: true }));
					resolve();
				})
				.catch(function (err) {
					console.log('err line306: ', err);
					reject(err);
				})
			;
		});
	}
});

// DDCS Actions
_.assign(exports, {
	initDB: function (serverName, remoteDBHost) {
		return new Promise(function(resolve, reject) {
			if(serverName === masterDBName) {
				// remote servers handled by watchdog to mark up/down state
				exports.connectDB('localhost', masterDBName)
					.then(function () {
						curDBMaster = _.get(exports, ['dbObj', 'dbConn', masterDBName]);
						resolve();
					})
					.catch(function (err) {
						console.log('err line60: ', err);
						reject();
					})
				;
			} else {
				exports.connectDB(remoteDBHost, masterDBName)
					.then(function () {
						curDBMaster = _.get(exports, ['dbObj', 'dbConn', masterDBName]);
						exports.connectDB('localhost', serverName)
							.then(function () {
								resolve();
							})
							.catch(function (err) {
								console.log('err line73: ', err);
								reject();
							})
						;
					})
					.catch(function (err) {
						console.log('err line79: ', err);
						reject();
					})
				;
			}
		});
	},
	masterQueActions: function (action, serverName, obj){
		if (curDBMaster) {
			const MasterQue = curDBMaster.model('masterque', _.get(exports, 'dbObj.masterQueSchema'));
			if (action === 'grabNextQue') {
				return new Promise(function(resolve, reject) {
					MasterQue.findOneAndRemove({serverName: serverName}, function (err, wpush){
						if(err) {
							reject(err);
						}
						resolve(wpush);
					});
				});
			}
			if(action === 'save') {
				return new Promise(function(resolve, reject) {
					const server = new MasterQue(obj);
					server.save(function (err, servers) {
						if (err) { reject(err) }
						resolve(servers);
					});
				});
			}
		} else {
			return Promise.reject('line:53, failed to connect to master db');
		}
	},
	remoteCommsActions: function (action, obj){
		if (curDBMaster) {
			const RemoteComm = curDBMaster.model('remotecomms', _.get(exports, 'dbObj.remoteCommsSchema'));
			if(action === 'create') {
				return new Promise(function(resolve, reject) {
					const crComm = new RemoteComm(obj);
					crComm.save(function (err, servers) {
						if (err) { reject(err) }
						resolve(servers);
					});
				});
			}
			if(action === 'read') {
				return new Promise(function(resolve, reject) {
					RemoteComm.find(obj, function (err, servers) {
						if (err) { reject(err) }
						resolve(servers);
					});
				});
			}
			if(action === 'update') {
				return new Promise(function(resolve, reject) {
					// console.log('update: ', obj);
					RemoteComm.update(
						{_id: obj._id},
						{$set: obj},
						{ upsert : true },
						function(err, servers) {
							if (err) { reject(err) }
							resolve(servers);
						}
					);
				});
			}
			if(action === 'delete') {
				return new Promise(function(resolve, reject) {
					RemoteComm.findOneAndRemove({_id: obj._id}, function (err, servers) {
						if (err) { reject(err) }
						resolve(servers);
					});
				});
			}
			if(action === 'removeNonCommPeople') {
				return new Promise(function(resolve, reject) {
					RemoteComm.remove(
						{
							updatedAt: {
								$lte: new Date(new Date().getTime() - (2 * 60 * 1000))
							}
						},
						function(err, units) {
							if (err) { reject(err) }
							resolve(units);
						}
					);
				});
			}
		} else {
			return Promise.reject('line:115, failed to connect to master db');
		}
	},
	serverActions: function (action, obj){
		if (curDBMaster) {
			const Server = curDBMaster.model('server', _.get(exports, 'dbObj.serverSchema'));
			if(action === 'create') {
				return new Promise(function(resolve, reject) {
					const server = new Server(obj);
					server.save(function (err, servers) {
						if (err) { reject(err) }
						resolve(servers);
					});
				});
			}
			if(action === 'read') {
				return new Promise(function(resolve, reject) {
					Server.find(obj, function (err, servers) {
						if (err) { reject(err) }
						resolve(servers);
					});
				});
			}
			if(action === 'update') {
				return new Promise(function(resolve, reject) {
					Server.findOneAndUpdate(
						{name: obj.name},
						{$set: obj},
						{new: true},
						function(err, servers) {
							if (err) { reject(err) }
							resolve(servers);
						}
					);
				});
			}
			if(action === 'delete') {
				return new Promise(function(resolve, reject) {
					Server.findOneAndRemove({name: obj.name}, function (err, servers) {
						if (err) { reject(err) }
						resolve(servers);
					});
				});
			}
		} else {
			return Promise.reject('line:161, failed to connect to master db');
		}
	},
	staticDictionaryActions: function (action, obj){
		if (curDBMaster) {
			const StaticDictionary = curDBMaster.model('staticDictionary', _.get(exports, 'dbObj.staticDictionarySchema'));
			if(action === 'read') {
				return new Promise(function(resolve, reject) {
					StaticDictionary.find(obj, function (err, staticDictionary) {
						if (err) { reject(err) }
						resolve(staticDictionary);
					});
				});
			}
		} else {
			return Promise.reject('line:177, failed to connect to master db');
		}
	},
	theaterActions: function (action){
		if (curDBMaster) {
			const Theater = curDBMaster.model('theater', _.get(exports, 'dbObj.theaterSchema'));
			if(action === 'read') {
				return new Promise(function(resolve, reject) {
					Theater.find(function (err, servers) {
						if (err) { reject(err) }
						resolve({theaters: servers});
					});
				});
			}
		} else {
			return Promise.reject('line:193, failed to connect to master db');
		}
	},
	unitDictionaryActions: function (action, obj){
		if (curDBMaster) {
			const UnitDictionary = curDBMaster.model('unitDictionary', _.get(exports, 'dbObj.unitDictionarySchema'));
			if(action === 'read') {
				return new Promise(function(resolve, reject) {
					UnitDictionary.find(obj, function (err, unitDictionary) {
						if (err) { reject(err) }
						resolve(unitDictionary);
					});
				});
			}
		} else {
			return Promise.reject('line:209, failed to connect to master db');
		}
	},
	userAccountActions: function (action, obj){
		if (curDBMaster) {
			const UserAccount = curDBMaster.model('userAccount', _.get(exports, 'dbObj.userAccountSchema'));
			// Promise.reject('ua: ', action, obj);
			if(action === 'create') {
				return new Promise(function(resolve, reject) {
					const useraccount = new UserAccount(obj);
					useraccount.save(function (err, useraccount) {
						if (err) { reject(err) }
						resolve(useraccount);
					});
				});
			}
			if(action === 'read') {
				return new Promise(function(resolve, reject) {
					UserAccount.find(obj, function (err, useraccount) {
						if (err) { reject(err) }
						resolve(useraccount);
					});
				});
			}
			if(action === 'getPerm') {
				return new Promise(function(resolve, reject) {
					UserAccount.find({authId: obj}, function (err, useraccount) {
						if (err) { reject(err) }
						resolve(useraccount);
					});
				});
			}
			if(action === 'updateSingleUCID') {
				return new Promise(function(resolve, reject) {
					UserAccount.findOneAndUpdate(
						{ucid: obj.ucid},
						{$set: obj},
						{new: true},
						function(err, uaccount) {
							if (err) { reject(err) }
							resolve(uaccount);
						}
					);
				});
			}
			if(action === 'updateSingleIP') {
				return new Promise(function(resolve, reject) {
					UserAccount.findOneAndUpdate(
						{lastIp: obj.ipaddr},
						{$set: obj},
						{new: true},
						function(err, uaccount) {
							if (err) { reject(err) }
							resolve(uaccount);
						}
					);
				});
			}
			if(action === 'update') {
				return new Promise(function(resolve, reject) {
					UserAccount.find({ucid: obj.ucid}, function (err, ucidUser) {
						if (err) {
							reject(err);
						}
						if (ucidUser.length === 0) {
							UserAccount.find({lastIp: obj.lastIp}, function (err, ipUser) {
								if (err) {
									reject(err);
								}
								if (ipUser.length !== 0) {
									ipUser = ipUser[0];
									_.set(ipUser, 'gameName', _.get(obj, 'gameName'));
									if(typeof obj.curSocket !== 'undefined'){
										_.set(ipUser, 'curSocket', _.get(obj, 'curSocket'));
									}
									ipUser.save(function (err) {
										if (err) {
											reject(err);
										}
										resolve(ipUser);
									});
								}
							});
						} else {
							ucidUser = ucidUser[0];
							_.set(ucidUser, 'gameName', _.get(obj, 'gameName'));
							_.set(ucidUser, 'lastIp', _.get(obj, 'lastIp'));
							if(typeof obj.curSocket !== 'undefined'){
								_.set(ucidUser, 'curSocket', _.get(obj, 'curSocket'));
							}
							ucidUser.save(function (err) {
								if (err) {
									reject(err);
								}
								resolve(ucidUser);
							});
						}
					});
				});
			}
			if(action === 'updateSocket') {
				// console.log('UA update socket line42: ', obj);
				return new Promise(function(resolve, reject) {
					UserAccount.find({authId: obj.authId}, function (err, authIdUser) {
						if (err) {
							reject(err);
						}
						if (authIdUser.length !== 0) {
							authIdUser = authIdUser[0];
							_.set(authIdUser, 'lastIp', _.get(obj, 'lastIp'));
							_.set(authIdUser, 'curSocket', _.get(obj, 'curSocket'));
							authIdUser.save(function (err) {
								if (err) {
									reject(err);
								}
								resolve(authIdUser);
							});
						} else {
							console.log('User '+obj.authId+' does not exist in user database line111');
							// reject('User '+obj.authId+' does not exist in user database');
						}
					});
				});
			}
			if(action === 'checkAccount') {
				var curBody = _.get(obj, 'body');
				return new Promise(function(resolve, reject) {
					UserAccount.find({authId: curBody.sub}, function (err, userAccount) {
						if (err) { reject(err); }
						if (userAccount.length === 0) {

							const useraccount = new UserAccount({
								authId: curBody.sub,
								realName: _.get(curBody, 'name'),
								firstName: _.get(curBody, 'given_name'),
								lastName: _.get(curBody, 'family_name'),
								nickName: _.get(curBody, 'nickname'),
								picture: _.get(curBody, 'picture'),
								gender: _.get(curBody, 'gender'),
								locale: _.get(curBody, 'locale')
							});
							useraccount.save(function (err, useraccount) {
								if (err) { reject(err) }
								resolve(useraccount);
							});
						} else {
							useraccount = userAccount[0];
							resolve(useraccount);
						}
					});
				});
			}
		} else {
			return Promise.reject('line:359, failed to connect to master db');
		}
	},
	weaponScoreActions: function (action, obj){
		if (curDBMaster) {
			const WeaponScore = curDBMaster.model('weaponScore', _.get(exports, 'dbObj.weaponScoreSchema'));
			if(action === 'read') {
				return new Promise(function(resolve, reject) {
					WeaponScore.find(obj, function (err, weaponDictionary) {
						if (err) { reject(err) }
						resolve(weaponDictionary);
					});
				});
			}
			if(action === 'readWeapon') {
				return new Promise(function(resolve, reject) {
					WeaponScore.find({_id: obj.typeName}, function (err, weaponscore) {
						if (err) { reject(err) }
						if (weaponscore.length === 0) {
							const curWeaponScore = new WeaponScore({
								_id: obj.typeName,
								name: obj.typeName,
								displayName: obj.displayName,
								category: obj.category,
								unitType: obj.unitType
							});
							curWeaponScore.save(function (err, saveweaponscore) {
								if (err) {
									reject(err);
								}
								resolve(saveweaponscore);
							});
						} else {
							var curWeaponScore = weaponscore[0];
							// console.log('curweaponscore: ', curWeaponScore);
							resolve(curWeaponScore);
						}
					});
				});
			}
			if(action === 'check') {
				WeaponScore.find({_id: obj.typeName}, function (err, weaponscore) {
					if (err) {
						console.log('line:396: ', err);
					}
					if (weaponscore.length === 0) {
						const curWeaponScore = new WeaponScore({
							_id: _.get(obj, 'typeName'),
							name: _.get(obj, 'typeName'),
							unitType: _.get(obj, 'unitType')
						});
						curWeaponScore.save(function (err) {
							if (err) {
								console.log('line:406: ', err);
							}
						});
					}
				});
			}
		} else {
			console.log('line:422, failed to connect to master db');
		}
	}
});

// local DB Actions
_.assign(exports, {
	baseActions: function (action, serverName, obj){
		var curTheater = _.get(constants, 'config.theater');
		var curObj = obj || {};
		_.set(curObj, 'mapType', curTheater);
		var curDBConn = _.get(exports, ['dbObj', 'dbConn', serverName]);
		if (curDBConn) {
			const Airfield = curDBConn.model(serverName+'_airfield', _.get(exports, 'dbObj.airfieldSchema'));
			if (action === 'read') {
				return new Promise(function(resolve, reject) {
					Airfield.find(curObj, function (err, dbairfields) {
						if (err) { reject(err) }
						resolve(dbairfields);
					});
				});
			}
			if (action === 'update') {
				return new Promise(function(resolve, reject) {
					Airfield.update(
						{_id: obj._id},
						{$set: obj},
						function(err, serObj) {
							if (err) { reject(err) }
							resolve(serObj);
						}
					);
				});
			}
			if(action === 'getClosestBase') {
				return new Promise(function(resolve, reject) {
					Airfield.find(
						{
							mainBase: true,
							enabled: true,
							centerLoc: {
								$near: {
									$geometry: {
										type: "Point",
										coordinates: obj.unitLonLatLoc
									}
								}
							},
							mapType: curTheater
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
							enabled: true,
							side: obj.playerSide,
							centerLoc: {
								$near: {
									$geometry: {
										type: "Point",
										coordinates: obj.unitLonLatLoc
									}
								}
							},
							mapType: curTheater
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
							enabled: true,
							side: constants.enemyCountry[obj.playerSide],
							centerLoc: {
								$near: {
									$geometry: {
										type: "Point",
										coordinates: obj.unitLonLatLoc
									}
								}
							},
							mapType: curTheater
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
					if (!curTheater) {
						constants.getServer(serverName)
							.then(function (serverConf) {
								// console.log('serconf: ', serverConf);
								Airfield.find(
									{mapType: _.get(serverConf, 'theater'), enabled: true},
									function(err, dbairfields) {
										if (err) { reject(err) }
										tAirfields = _.transform(dbairfields, function (result, value) {
											result.push({name: value.name, side: value.side})
										}, []);
										resolve(tAirfields);
									}
								);
							})
							.catch(function (err) {
								reject('line:542, failed to connect to db: ', serverName, err);
							})
						;
					} else {
						Airfield.find(
							{mapType: curTheater, enabled: true},
							function(err, dbairfields) {
								if (err) { reject(err) }
								tAirfields = _.transform(dbairfields, function (result, value) {
									result.push({name: value.name, side: value.side})
								}, []);
								resolve(tAirfields);
							}
						);
					}
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
		} else {
			return Promise.reject('line:555, failed to connect to db: ', serverName);
		}
	},
	cmdQueActions: function (action, serverName, obj){
		var curDBConn = _.get(exports, ['dbObj', 'dbConn', serverName]);
		if (curDBConn) {
			const CmdQue = curDBConn.model(serverName+'_cmdque', _.get(exports, 'dbObj.cmdQueSchema'));
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
		} else {
			return Promise.reject('line:596, failed to connect to db: ', serverName);
		}
	},
	processActions: function (action, serverName, obj){
		var curDBConn = _.get(exports, ['dbObj', 'dbConn', serverName]);
		if (curDBConn) {
			const ProcessQue = curDBConn.model(serverName+'_processque', _.get(exports, 'dbObj.processSchema'));
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
		} else {
			return Promise.reject('line:661, failed to connect to db: ', serverName);
		}
	},
	simpleStatEventActions: function (action, serverName, obj){
		var curDBConn = _.get(exports, ['dbObj', 'dbConn', serverName]);
		if (curDBConn) {
			const SimpleStatEvent = curDBConn.model(serverName+'_simpleStatEvent', _.get(exports, 'dbObj.simpleStatEventSchema'));
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
		} else {
			return Promise.reject('line:694, failed to connect to db: ', serverName);
		}
	},
	srvPlayerActions: function (action, serverName, obj){
		var curDBConn = _.get(exports, ['dbObj', 'dbConn', serverName]);
		if (curDBConn) {
			const SrvPlayer = curDBConn.model(serverName+'_srvPlayer', _.get(exports, 'dbObj.srvPlayerSchema'));
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
							sObj.curLifePoints = _.get(constants, 'config.startLifePoints', 0);
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
								// console.log('cf: ', constants);
								obj.curLifePoints = _.get(constants, 'config.startLifePoints', 0);
								if (curPly.sideLockTime < curTime) {
									obj.sideLockTime = curTime + _.get(constants, 'time.oneHour');
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
				// console.log('addPt: ', obj);
				return new Promise(function(resolve, reject) {
					// if addLifePoints exists, use that and done reset lifepoint fly cache
					SrvPlayer.find({_id: obj._id}, function (err, serverObj) {
						var addPoints = (_.get(obj, 'addLifePoints')) ? _.get(obj, 'addLifePoints') : _.get(serverObj, [0, 'cachedRemovedLPPoints']);
						var curAction = 'addLifePoint';
						var curPlayerLifePoints = _.get(serverObj, [0, 'curLifePoints'], 0);
						var curTotalPoints = (curPlayerLifePoints >= 0) ? curPlayerLifePoints + addPoints : addPoints;
						var maxLimitedPoints = (curTotalPoints > _.get(constants, 'maxLifePoints')) ? _.get(constants, 'maxLifePoints') : curTotalPoints;
						var msg;
						if (err) {
							reject(err)
						}
						if (serverObj.length > 0) {
							var setObj = {
								curLifePoints: maxLimitedPoints,
								lastLifeAction: curAction,
								safeLifeActionTime: (nowTime + _.get(constants, 'time.fifteenSecs'))
							};
							if(!_.get(obj, 'addLifePoints')) {
								_.set(setObj, 'cachedRemovedLPPoints', 0);
							}
							// console.log('addLP: ', obj, setObj);
							SrvPlayer.findOneAndUpdate(
								{_id: obj._id},
								{ $set: setObj },
								function(err, srvPlayer) {
									if (err) { reject(err) }
									if (obj.execAction === 'PeriodicAdd') {
										msg = '+' + _.round(addPoints, 2).toFixed(2) + 'LP(T:' + maxLimitedPoints.toFixed(2) + ')';
									} else {
										msg = 'You Have Just Gained ' + addPoints.toFixed(2) + ' Life Points! ' + obj.execAction + '(Total:' + maxLimitedPoints.toFixed(2) + ')'
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
				// console.log('rmPt: ', obj);
				return new Promise(function(resolve, reject) {
					SrvPlayer.find({_id: obj._id}, function (err, serverObj) {
						var removePoints = _.get(obj, 'removeLifePoints');
						var curAction = 'removeLifePoints';
						var curPlayerObj = _.first(serverObj);
						var curPlayerLifePoints = _.get(curPlayerObj, 'curLifePoints', 0);
						var curTotalPoints = curPlayerLifePoints - removePoints;
						var maxLimitedPoints = (curTotalPoints > _.get(constants, 'maxLifePoints')) ? _.get(constants, 'maxLifePoints') : curTotalPoints;
						if (err) {
							reject(err)
						}
						// console.log('removeP: ', curTotalPoints, curPlayerObj, serverObj, obj);
						if (serverObj.length > 0) {
							if (curTotalPoints < 0) {
								// console.log('Removed ' + curPlayerObj.name + ' from aircraft for not enough points');
								DCSLuaCommands.forcePlayerSpectator(
									serverName,
									curPlayerObj.playerId,
									'You Do Not Have Enough Points To Fly This Vehicle' +
									'{' + removePoints.toFixed(2) + '/' + curPlayerLifePoints.toFixed(2) + ')'
								);
								resolve(serverObj);
							} else {
								var setObj = {
									curLifePoints: maxLimitedPoints,
									lastLifeAction: curAction,
									safeLifeActionTime: (nowTime + _.get(constants, 'time.fifteenSecs'))
								};
								if(_.get(obj, 'storePoints')) {
									_.set(setObj, 'cachedRemovedLPPoints', removePoints);
								}
								SrvPlayer.findOneAndUpdate(
									{_id: obj._id},
									{ $set: setObj },
									function(err, srvPlayer) {
										if (err) { reject(err) }
										DCSLuaCommands.sendMesgToGroup( obj.groupId, serverName, 'You Have Just Used ' + removePoints.toFixed(2) + ' Life Points! ' + obj.execAction + '(Total:' + curTotalPoints.toFixed(2) + ')', 5);
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
									if (_.get(constants, 'config.inGameHitMessages', true)) {
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
											if (_.get(constants, 'config.inGameHitMessages', true)) {
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
		} else {
			return Promise.reject('line:989, failed to connect to db: ', action, serverName, obj);
		}
	},
	staticCrateActions: function (action, serverName, obj){
		var curDBConn = _.get(exports, ['dbObj', 'dbConn', serverName]);
		if (curDBConn) {
			const StaticCrates = curDBConn.model(serverName+'_crate', _.get(exports, 'dbObj.staticCratesSchema'));
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
		} else {
			return Promise.reject('line:1093, failed to connect to db: ', serverName);
		}
	},
	statSessionActions: function (action, serverName, obj){
		var curDBConn = _.get(exports, ['dbObj', 'dbConn', serverName]);
		if (curDBConn) {
			const StatSession = curDBConn.model(serverName+'_statSession', _.get(exports, 'dbObj.statSessionSchema'));
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
		} else {
			return Promise.reject('line:1148, failed to connect to db: ', serverName);
		}
	},
	unitActions: function (action, serverName, obj){
		var curDBConn = _.get(exports, ['dbObj', 'dbConn', serverName]);
		if (curDBConn) {
			const Unit = curDBConn.model(serverName+'_unit', _.get(exports, 'dbObj.unitSchema'));
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
			if (action === 'readMin') {
				return new Promise(function(resolve, reject) {
					Unit.find(obj).exec(function (err, dbUnits) {
						var curDbUnits = [];
						if (err) { reject(err) }
						_.forEach(dbUnits, function (unit) {
							var pickArray = [
								'_id',
								'lonLatLoc',
								'alt',
								'hdg',
								'speed',
								'coalition',
								'type',
								'playername',
								'playerOwnerId'
							];
							curDbUnits.push(_.pick(unit, pickArray));
						});
						resolve(curDbUnits);
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
					var fiveMinsAgo = new Date(new Date()).getTime() - _.get(constants, 'time.fiveMins');
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
		} else {
			return Promise.reject('line:1296, failed to connect to db: ', serverName);
		}
	},
	webPushActions: function (action, serverName, obj){
		var curDBConn = _.get(exports, ['dbObj', 'dbConn', serverName]);
		if (curDBConn) {
			const WebPush = curDBConn.model(serverName+'_webpush', _.get(exports, 'dbObj.webPushSchema'));
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
		} else {
			return Promise.reject('line:1337, failed to connect to db: ', serverName);
		}
	}
});

