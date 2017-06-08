const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema defines how chat messages will be stored in MongoDB
const UnitSchema = new Schema({
	_id: Number,
	unitID: {
		type: Number,
		required: true
	},
	type: {
		type: String,
		required: true
	},
	coalition: {
		type: Number,
		min: 1,
		max: 2,
		required: true
	},
	lat: {
		type: Number,
		required: true
	},
	lon: {
		type: Number,
		required: true
	},
	alt: {
		type: Number,
		required: true
	},
	hdg: {
		type: Number,
		min: 0,
		max: 359,
		required: true
	},
	speed: {
		type: Number,
		required: true
	},
	playername: {
		type: String
	},
	playerOwnerId: {
		type: Number
	}
},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

module.exports = mongoose.model('Unit', UnitSchema);
