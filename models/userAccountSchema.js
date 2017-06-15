const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

const UserAccountSchema = new Schema({
		_id: {
			type: String,
			required: true
		},
		gameName: {
			type: String
		},
		realName: {
			type: String
		},
		lastIp: {
			type: String
		},
		curSocket: {
			type: String
		},
		curUnitId: {
			type: String
		},
		curSlotId: {
			type: String
		},
		ucid: {
			type: String
		}
	},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

module.exports = UserAccountSchema;
