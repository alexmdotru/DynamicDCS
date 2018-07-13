const mongoose = require('mongoose');

// Schema defines how chat messages will be stored in MongoDB
const MasterQueSchema = new mongoose.Schema({
		actionObj: {
			type: Object,
			required: true
		},
		serverName: {
			type: String,
			required: true
		}
	},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

module.exports = MasterQueSchema;
