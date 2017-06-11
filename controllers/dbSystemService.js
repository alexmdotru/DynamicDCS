const mongoose = require('mongoose'),
	_ = require('lodash'),
	dbConfig = require('../config/db');

//changing promises to bluebird
mongoose.Promise = require('bluebird');

var systemdb = mongoose.createConnection();
systemdb.open(dbConfig.systemHost, dbConfig.systemDatabase);

/*
console.log(systemmongoose);
var systemdb = systemmongoose.createConnection(dbConfig.systemDatabase);
systemdb.on('error', console.error.bind(console, 'connection error:'));
systemdb.once('open', function() {
	console.log('connected to Mongo System');
});
*/

// include mongoose db schemas
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
			Server.update(
				{name: obj.name},
				{$set: obj},
				function(err, servers) {
					if (err) { reject(err) }
					resolve(servers);
				}
			);
		});
	}
	if(action === 'delete') {
		return new Promise(function(resolve, reject) {
			Unit.findOneAndRemove(obj._name, function (err, servers) {
				if (err) { reject(err) }
				resolve(servers);
			});
		});
	}
};
