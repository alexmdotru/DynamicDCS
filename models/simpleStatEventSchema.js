const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema defines how chat messages will be stored in MongoDB
const SimpleStatEventSchema = new Schema({
		sessionName: {
			type: String,
			required: true
		},
		eventCode: {
			type: String,
			required: true
		},
		iucid: {
			type: String
		},
		iName: {
			type: String
		},
		tucid: {
			type: String
		},
		tName: {
			type: String
		},
		displaySide: {
			type: String,
			required: true
		},
		roleCode: {
			type: String
		},
		msg: {
			type: String
		},
		score: {
			type: Number
		},
		showChart: {
			type: Boolean,
			default: false
		}
	},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

SimpleStatEventSchema.index({ sessionName: 1 });
module.exports = SimpleStatEventSchema;
