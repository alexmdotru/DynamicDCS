const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema defines how chat messages will be stored in MongoDB
const AirfieldSchema = new Schema({
	_id: {
		type: String,
		required: true
	},
	baseId: {
		type: Number,
		required: true
	},
	farp: {
		type: Boolean,
		default: false
	},
	expansion: {
		type: Boolean,
		default: false
	},
	lat: {
		type: Number,
		required: true
	},
	lon: {
		type: Number,
		required: true
	},
	x: {
		type: Number,
		required: true
	},
	y: {
		type: Number,
		required: true
	},
	alt: {
		type: Number,
		required: true
	},
	hdg: {
		type: Number,
		min: 0,
		max: 359,
		required: true
	},
	country: {
		type: String
	},
	name: {
		type: String,
		required: true
	},
	parentBase: {
		type: String
	},
	side: {
		type: Number,
		min: 0,
		max: 2,
		required: true
	},
	spawnZones: {
		type: Object
	}
},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

AirfieldSchema.static('findByName', function (name, callback) {
	return this.find({ name: name }, callback);
});

AirfieldSchema.index({ cleanName: 1 });

module.exports = AirfieldSchema;
