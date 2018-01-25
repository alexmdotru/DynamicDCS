const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema defines how chat messages will be stored in MongoDB
const BanUserSchema = new Schema({
		_id: {
			type: String,
			required: true
		},
		ucid: {
			type: String,
			required: true
		},
		name: {
			type: String
		},
		ipaddr: {
			type: String
		}
	},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

module.exports = BanUserSchema;
