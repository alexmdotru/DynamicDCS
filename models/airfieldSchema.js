const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema defines how chat messages will be stored in MongoDB
const AirfieldSchema = new Schema({
	_id: String,
	name: {
		type: String,
		required: true
	},
	coalition: {
		type: Number,
		min: 1,
		max: 2,
		required: true
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
