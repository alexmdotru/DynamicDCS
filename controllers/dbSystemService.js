const mongoose = require('mongoose'),
	_ = require('lodash'),
	dbConfig = require('../config/db');

//changing promises to bluebird
mongoose.Promise = require('bluebird');

var systemdb = mongoose.createConnection();
systemdb.open(dbConfig.systemHost, dbConfig.systemDatabase);

// include mongoose db schemas
var userAccountSchema = require('../models/userAccountSchema');
const UserAccount = systemdb.model('userAccount', userAccountSchema);

exports.userAccountActions = function (action, obj){
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
			UserAccount.find(function (err, useraccount) {
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
	if(action === 'update') {
		return new Promise(function(resolve, reject) {
			UserAccount.find({ucid: obj.ucid}, function (err, ucidUser) {
				if (err) {
					reject(err);
				}
				if (ucidUser.length === 0) {
					// if ip is 10308 its the same as ::1
					if(obj.ipaddr === ':10308' || obj.ipaddr === '::ffff:127.0.0.1'){
						_.set(obj, 'lastIp', '127.0.0.1');
					}
					UserAccount.find({lastIp: obj.lastIp}, function (err, ipUser) {
						if (err) {
							reject(err);
						}
						if (ipUser.length === 0) {
							console.log('cant match up user with account ', obj.lastIp);
						}else{
							ipUser = ipUser[0];
							_.set(ipUser, 'gameName', _.get(obj, 'gameName'));
							_.set(ipUser, 'ucid', _.get(obj, 'ucid'));
							ipUser.save(function (err) {
								if (err) {
									reject(err);
								}
								resolve();
							});
						}
					});
				} else {
					ucidUser = ucidUser[0];
					_.set(ucidUser, 'gameName', _.get(obj, 'gameName'));
					_.set(ucidUser, 'lastIp', _.get(obj, 'lastIp'));
					ucidUser.save(function (err) {
						if (err) {
							reject(err);
						}
						resolve();
					});
				}
			});
		});
	}
	if(action === 'checkAccount') {
		return new Promise(function(resolve, reject) {
			var curIP;
			var curSocket = _.get(obj, 'headers.cookie').substr(3);
			console.log('curSocket: ',curSocket);
			UserAccount.find({authId: obj.user.sub}, function (err, userAccount) {
				if (err) {
					reject(err);
				}
				if (userAccount.length === 0) {
					curIP = obj.ip;
					if(obj.ip === ':10308' || obj.ip === '::ffff:127.0.0.1'){
						curIP = '127.0.0.1';
					}

					const useraccount = new UserAccount({
						authId: obj.user.sub,
						lastIp: curIP,
						realName: _.get(obj, 'body.name'),
						firstName: _.get(obj, 'body.given_name'),
						lastName: _.get(obj, 'body.family_name'),
						nickName: _.get(obj, 'body.nickname'),
						picture: _.get(obj, 'body.picture'),
						gender: _.get(obj, 'body.gender'),
						locale: _.get(obj, 'body.locale'),
						curSocket: curSocket
					});
					useraccount.save(function (err, useraccount) {
						if (err) { reject(err) }
						resolve(useraccount);
					});
				} else {
					console.log('usersFound');
					resolve();
				}
			});
		});
	}
};


var serverSchema = require('../models/serverSchema');
const Server = systemdb.model('server', serverSchema);

exports.serverActions = function (action, obj){
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
			Server.find(function (err, servers) {
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
};

var theaterSchema = require('../models/theaterSchema');
const Theater = systemdb.model('theater', theaterSchema);

exports.theaterActions = function (action){
	if(action === 'read') {
		return new Promise(function(resolve, reject) {
			Theater.find(function (err, servers) {
				if (err) { reject(err) }
				resolve(servers);
			});
		});
	}
};
