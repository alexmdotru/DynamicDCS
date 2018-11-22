const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema defines how chat messages will be stored in MongoDB
const UnitSchema = new Schema({
	_id: String,
	name: {
		type: String,
		required: true
	},
	unitId: {
		type: Number
	},
	groupId: {
		type: Number
	},
	type: {
		type: String,
		required: true
	},
	coalition: {
		type: Number,
		min: 1,
		max: 2,
		required: true
	},
	category: {
		type: String,
		required: true
	},
	country: {
		type: String,
		required: true
	},
	lonLatLoc: {
		type: [Number],
		index: '2dsphere'
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
	life: {
		type: Number
	},
	maxLife: {
		type: Number
	},
	speed: {
		type: Number
	},
	playerCanDrive: {
		type: Boolean,
		default: false
	},
	groupName: {
		type: String
	},
	playername: {
		type: String
	},
	playerOwnerId: {
		type: String
	},
	hidden: {
		type: Boolean,
		default: false
	},
	enabled: {
		type: Boolean,
		default: true
	},
	dead: {
		type: Boolean,
		default: false
	},
	proxChkGrp: {
		type: String
	},
	jtacTarget: {
		type: String
	},
	jtacReplenTime: {
		type: Date
	},
	inAir: {
		type: Boolean
	},
	isTroop: {
		type: Boolean,
		default: false
	},
	isCrate: {
		type: Boolean,
		default: false
	},
	isCombo: {
		type: Boolean,
		default: false
	},
	isResync: {
		type: Boolean,
		default: true
	},
	isAI: {
		type: Boolean,
		default: false
	},
	troopType: {
		type: String
	},
	virtCrateType: {
		type: String
	},
	intCargoType: {
		type: String
	},
	spawnCat: {
		type: String
	},
	ammo: {
		type: Array
	},
	markId: {
		type: Number
	}
},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

module.exports = UnitSchema;
