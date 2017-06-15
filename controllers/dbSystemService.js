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
	if(action === 'update') {

		console.log(obj);
		return new Promise(function(resolve, reject) {
			UserAccount.find({ucid: obj.ucid}, function (err, ucidUser) {
				if (err) {
					reject(err);
				}
				console.log('uciduser: ',ucidUser.length);
				if (ucidUser.length === 0) {
					console.log('lastIp: ',obj.lastIp);
					UserAccount.find({lastIp: obj.lastIp}, function (err, ipUser) {
						console.log('ipuser: ',ipUser.length);
						if (err) {
							reject(err);
						}
						if (ipUser.length === 0) {
							console.log('cant match up user with account');
							reject('cant match up user with account');
						}
						ipUser = ipUser[0];
						_.set(ipUser, 'gameName', _.get(obj, 'gameName'));
						_.set(ipUser, 'curSocket', _.get(obj, 'cursocket'));
						_.set(ipUser, 'ucid', _.get(obj, 'ucid'));
						ipUser.save(function (err) {
							if (err) {
								reject(err);
							}
							resolve();
						});
					});
				} else {
					ucidUser = ucidUser[0];
					_.set(ucidUser, 'gameName', _.get(obj, 'gameName'));
					_.set(ucidUser, 'curSocket', _.get(obj, 'cursocket'));
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
		/*
		return new Promise(function(resolve, reject) {
			UserAccount.findOneAndUpdate(
				{_id: obj._id},
				{$set: obj},
				{new: true},
				function(err, useraccount) {
					if (err) { reject(err) }
					resolve(useraccount);
				}
			);
		});
		*/
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
