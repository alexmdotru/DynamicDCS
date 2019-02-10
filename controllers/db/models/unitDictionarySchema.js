const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema defines how chat messages will be stored in MongoDB
const UnitDictionarySchema = new Schema({
		_id: {
			type: String,
			required: true
		},
		type: {
			type: String,
			required: true
		},
		country: {
			type: Array,
			required: true
		},
		category: {
			type: String,
			required: true
		},
		spawnCat: {
			type: String,
			required: true
		},
		spawnCatSec: {
			type: String
		},
		comboName: {
			type: Array,
			required: true
		},
		launcher: {
			type: Boolean,
			default: false
		},
		spawnCount: {
			type: Number,
			default: 1
		},
		threatLvl: {
			type: Number,
			default: 0
		},
		reloadReqArray: {
			type: Schema.Types.Mixed
		},
		enabled: {
			type: Boolean,
			default: true
		},
		lifeCost: {
			type: Number,
			default: 1
		},
		LPCost: {
			type: Number,
			default: 1
		},
		timePeriod: {
			type: Array,
			required: true
		},
		sort: {
			type: Number,
			default: 0
		},
		centerRadar: {
			type: Boolean,
			default: false
		},
		secRadarNum: {
			type: Number,
			default: 1
		},
		spokeDistance: {
			type: Number,
			default: 0.1
		},
		spoke: {
			type: Boolean,
			default: false
		}

	},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

module.exports = UnitDictionarySchema;
