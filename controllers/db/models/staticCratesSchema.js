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
			default: 'iso_container_small_cargo'
		},
		category: {
			type: String,
			default: 'Cargo'
		},
		type: {
			type: String,
			default: 'iso_container_small'
		},
		heading: {
			type: Number,
			min: 0,
			max: 359,
			required: true
		},
		canCargo: {
			type: Boolean,
			default: true
		},
		mass: {
			type: Number,
			default: 100
		},
		playerOwnerId: {
			type: String,
			required: true
		},
		templateName: {
			type: String
		},
		special: {
			type: String
		},
		crateAmt: {
			type: Number,
		},
		isCombo: {
			type: Boolean,
			default: false
		},
		playerCanDrive: {
			type: Boolean,
			default: true
		}

	},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

module.exports = StaticCrateSchema;
