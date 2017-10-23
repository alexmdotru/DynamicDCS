const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema defines how chat messages will be stored in MongoDB
const UnitDictionarySchema = new Schema({
		_id: {
			type: String,
			required: true
		},
		type: {
			type: String,
			required: true
		},
		country: {
			type: Array,
			required: true
		},
		category: {
			type: String,
			required: true
		},
		spawnCat: {
			type: String,
			required: true
		},
		comboName: {
			type: String
		},
		launcher: {
		type: Boolean,
		default: false
		},
		enabled: {
			type: Boolean,
			default: true
		}
	},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

module.exports = UnitDictionarySchema;
