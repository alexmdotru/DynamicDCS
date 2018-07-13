const mongoose = require('mongoose');

// Schema defines how chat messages will be stored in MongoDB
const RemoteCommsSchema = new mongoose.Schema({
	_id: {
		type: String,
		required: true
	},
	isInSRS: {
		type: Boolean,
		default: false
	},
	isInDiscord: {
		type: Boolean,
		default: false
	}
},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

module.exports = RemoteCommsSchema;
