const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema defines how chat messages will be stored in MongoDB
const StatSrvEventSchema = new Schema({
		sessionName: {
			type: String,
			required: true
		},
		name: {
			type: String,
			required: true
		},
		arg1: {
			type: String
		},
		arg2: {
			type: String
		},
		arg3: {
			type: String
		},
		arg4: {
			type: String
		},
		arg5: {
			type: String
		},
		arg6: {
			type: String
		},
		arg7: {
			type: String
		},
		arg8: {
			type: String
		},
		arg9: {
			type: String
		}
	},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

module.exports = StatSrvEventSchema;
