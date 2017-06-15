const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

const UserAccountSchema = new Schema({
		authId: {
			type: String,
			required: true,
			index: { unique: true }
		},
		permLvl: {
			type: Number,
			required: true,
			default: 100
		},
		gameName: {
			type: String
		},
		realName: {
			type: String
		},
		side: {
			type: Number,
			min: 1,
			max: 2
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
			type: String,
			index: { unique: true }
		}
	},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

UserAccountSchema.index({ authId: 1 });

module.exports = UserAccountSchema;
