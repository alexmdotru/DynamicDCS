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
			min: 1,
			max: 2
		},
		slot: {
			type: String
		},
		socketID: {
			type: String
		},
		ucid: {
			type: String,
			required: true
		}
	},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

module.exports = srvPlayerSchema;
