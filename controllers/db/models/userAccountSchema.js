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
		lastIp: {
			type: String
		},
		lastServer: {
			type: String
		},
		curSocket: {
			type: String
		},
		ucid: {
			type: String
		},
		firstName: {
			type: String
		},
		lastName: {
			type: String
		},
		nickName: {
			type: String
		},
		picture: {
			type: String
		},
		gender: {
			type: String
		},
		locale: {
			type: String
		}
	},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

UserAccountSchema.index({ authId: 1 });

module.exports = UserAccountSchema;
