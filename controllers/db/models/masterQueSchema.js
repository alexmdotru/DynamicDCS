const mongoose = require('mongoose');

// Schema defines how chat messages will be stored in MongoDB
const MasterQueSchema = new mongoose.Schema(
	{
		payload: {
			type: mongoose.Schema.Types.Mixed,
			required: true
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
