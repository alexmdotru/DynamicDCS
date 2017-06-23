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
	//console.log('frontobj', obj);
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
		//console.log(obj);
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
						if (ipUser.length === 0) {
							//console.log('cant match up user with account ', obj.lastIp);
						}else{
							ipUser = ipUser[0];
							_.set(ipUser, 'gameName', _.get(obj, 'gameName'));
							_.set(ipUser, 'ucid', _.get(obj, 'ucid'));
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
	if(action === 'checkAccount') {
		return new Promise(function(resolve, reject) {
			UserAccount.find({authId: obj.user.sub}, function (err, userAccount) {
				if (err) {
					reject(err);
				}
				if (userAccount.length === 0) {

					const useraccount = new UserAccount({
						authId: obj.user.sub,
						lastIp: curIP,
						realName: _.get(obj, 'body.name'),
						firstName: _.get(obj, 'body.given_name'),
						lastName: _.get(obj, 'body.family_name'),
						nickName: _.get(obj, 'body.nickname'),
						picture: _.get(obj, 'body.picture'),
						gender: _.get(obj, 'body.gender'),
						locale: _.get(obj, 'body.locale')
					});
					useraccount.save(function (err, useraccount) {
						if (err) { reject(err) }
						resolve(useraccount);
					});
				} else {
					useraccount = userAccount[0];
					_.set(useraccount, 'lastIp', curIP);
					useraccount.save(function (err, useraccount) {
						if (err) { reject(err) }
						resolve(useraccount);
					});
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
