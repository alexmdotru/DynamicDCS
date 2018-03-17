const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema defines how chat messages will be stored in MongoDB
const srvPlayerSchema = new Schema({
		_id: String,
		ipaddr: {
			type: String
		},
		lang: {
			type: String
		},
		name: {
			type: String
		},
		ping: {
			type: Number
		},
		side: {
			type: Number,
			min: 0,
			max: 2,
			default: 0
		},
		slot: {
			type: String
		},
		socketID: {
			type: String
		},
		playerId: {
			type: String
		},
		ucid: {
			type: String,
			required: true
		},
		sessionName: {
			type: String
		},
		curCapLives: {
			type: Number,
			default: 4
		},
		nextCapLife: {
			type: Number,
			default: 0
		},
		gicTimeLeft: {
			type: Number,
			default: 0
		}
	},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

module.exports = srvPlayerSchema;
