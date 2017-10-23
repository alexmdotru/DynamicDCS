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
		defBaseSides: {
			type: Object
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
