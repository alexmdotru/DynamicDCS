const mongoose = require('mongoose'),
	_ = require('lodash'),
	dbConfig = require('../config/db');

//changing promises to bluebird
mongoose.Promise = require('bluebird');
mongoose.connect(dbConfig.database);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
	console.log('connected to mongodb');
});

// include mongoose db schemas
const Unit = require('../models/unit');


exports.unitActions = function (action, obj){
	if(action === 'save') {
		const unit = new Unit(obj);
		unit.save(function (err, newUnit) {
			if (err) return console.error(err);
		});
	}
	if(action === 'dropall') {
		mongoose.connection.db.dropCollection('units');
	}
};

