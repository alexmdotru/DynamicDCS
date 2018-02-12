const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema defines how chat messages will be stored in MongoDB
const StaticDictionarySchema = new Schema({
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
		shape_name: {
			type: String,
			required: true
		},
		category: {
			type: String,
			required: true
		},
		canCargo: {
			type: Boolean,
			default: false
		}
	},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

module.exports = StaticDictionarySchema;
