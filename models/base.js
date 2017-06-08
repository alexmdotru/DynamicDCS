const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema defines how chat messages will be stored in MongoDB
const BaseSchema = new Schema({
	baseName: {
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
		timestamps: true // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
	}
);

module.exports = mongoose.model('Base', BaseSchema);
