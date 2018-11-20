var GeoJSON = require('mongoose-geojson-schema');
var mongoose = require('mongoose');

// Schema defines how chat messages will be stored in MongoDB
const AirfieldSchema = new mongoose.Schema({
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
	mainBase: {
		type: Boolean,
		default: false
	},
	centerLoc: {
		type: [Number],
		index: '2dsphere'
	},
	logiCenter: {
		type: [Number],
		index: '2dsphere'
	},
	polygonLoc: {
		type: Object
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
	spawnAngle: {
		type: Number,
		min: 0,
		max: 359
	},
	spawnZones: {
		type: Object
	},
	maxUnitThreshold: {
		type: Number
	},
	replenTime: {
		type: Date
	},
	unitSide: {
		type: Number
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

module.exports = AirfieldSchema;
