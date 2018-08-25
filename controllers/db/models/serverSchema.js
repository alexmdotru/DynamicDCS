const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema defines how chat messages will be stored in MongoDB
const ServerSchema = new Schema({
		_id: {
			type: String,
			required: true
		},
		name: {
			type: String,
			required: true
		},
		theater: {
			type: String,
			required: true,
			default: 'Caucasus'
		},
		totalTicks: {
			type: Number
		},
		secsBwtTicks: {
			type: Number
		},
		defBaseSides: {
			type: Object
		},
		replenThresholdFARP: {
			type: Number
		},
		replenThresholdBase: {
			type: Number
		},
		replenTimer: {
			type: Number
		},
		minUnits: {
			type: Number
		},
		maxUnits: {
			type: Number
		},
		spwnLimitsPerTick: {
			type: Object
		},
		ip: {
			type: String,
			required: true,
			default: 'localhost'
		},
		dcsClientPort: {
			type: Number,
			required: true,
			default: 3001
		},
		dcsGameGuiPort: {
			type: Number,
			required: true,
			default: 3002
		},
		enabled: {
			type: Boolean,
			default: false
		},
		maxCrates: {
			type: Number,
			required: true,
			default: 10
		},
		maxTroops: {
			type: Number,
			required: true,
			default: 1
		},
		maxUnitsMoving: {
			type: Number,
			required: true,
			default: 7
		},
		startLifePoints: {
			type: Number,
			required: true,
			default: 12
		},
		inGameHitMessages: {
			type: Boolean,
			default: true
		},
		mapRotation: {
			type: Array,
			required: true
		},
		SRSFilePath: {
			type: String,
			required: true,
			default: 'C:/Program Files/DCS-SimpleRadio-Standalone/clients-list.json'
		},
		isDiscordAllowed: {
			type: Boolean,
			default: true
		},
        maxLngRngA2A: {
            type: Number,
            default: 0
        },
        weaponRules: {
            type: Array,
            required: true,
			default: []
		}
	},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

ServerSchema.static('findByName', function (name, callback) {
	return this.find({ name: name }, callback);
});

module.exports = ServerSchema;
