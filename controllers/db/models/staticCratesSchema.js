const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema defines how chat messages will be stored in MongoDB
const StaticCrateSchema = new Schema({
		_id: {
			type: String,
			required: true
		},
		name: {
			type: String,
			required: true
		},
		lonLatLoc: {
			type: [Number],
			index: '2dsphere'
		},
		shapeName: {
			type: String,
			required: true
		},
		category: {
			type: String,
			required: true
		},
		mass: {
			type: String,
			required: true
		}
	},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

TheaterSchema.static('findByName', function (name, callback) {
	return this.find({ name: name }, callback);
});

module.exports = TheaterSchema;
