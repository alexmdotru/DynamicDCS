const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema defines how chat messages will be stored in MongoDB
const StatSrvEventSchema = new Schema({
		sessionName: {
			type: String,
			required: true
		},
		score: {
			type: Number
		},
		name: {
			type: String,
			required: true
		},
		weaponName: {
			type: String
		},
		winner: {
			type: String
		},
		msg: {
			type: String
		},
		iPlayerUcid: {
			type: String
		},
		iPlayerName: {
			type: String
		},
		iPlayerId: {
			type: String
		},
		iPlayerUnitId: {
			type: String
		},
		iPlayerUnitType: {
			type: String
		},
		iPlayerSide: {
			type: String
		},
		iPlayerSlotType: {
			type: String
		},
		tPlayerUcid: {
			type: String
		},
		tPlayerName: {
			type: String
		},
		tPlayerId: {
			type: String
		},
		tPlayerUnitId: {
			type: String
		},
		tPlayerUnitType: {
			type: String
		},
		tPlayerSide: {
			type: String
		},
		tPlayerSlotType: {
			type: String
		},
		prevSide: {
			type: String
		},
		reasonCode: {
			type: String
		},
		unitMissionId: {
			type: String
		},
		airdromeName: {
			type: String
		},
		time: {
			type: String
		},
		eventId: {
			type: String
		},
		place: {
			type: String
		},
		subPlace: {
			type: String
		}
	},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

module.exports = StatSrvEventSchema;
