var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Schema defines how chat messages will be stored in MongoDB
var MasterQueSchema = new Schema(
	{
		payload: {
			type: Object
		},
		serverName: {
			type: String,
			required: true
		},
		side: {
			type: Number,
			min: 0,
			max: 3,
			required: true
		}
	},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

module.exports = MasterQueSchema;
