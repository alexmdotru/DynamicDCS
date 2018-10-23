const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema defines how chat messages will be stored in MongoDB
const WeaponScoreSchema = new Schema({
		_id: {
			type: String,
			required: true
		},
		name: {
			type: String,
			required: true
		},
		displayName: {
			type: String
		},
		category: {
			type: String
		},
		unitType: {
			type: String
		},
		score: {
			type: Number,
			required: true,
			default: 1
		},
		tier: {
			type: Number,
			required: true,
			default: 0
		}
	},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

WeaponScoreSchema.static('findByName', function (name, callback) {
	return this.find({ name: name }, callback);
});

module.exports = WeaponScoreSchema;
