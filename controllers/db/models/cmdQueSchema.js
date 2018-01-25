const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema defines how chat messages will be stored in MongoDB
const CmdQueSchema = new Schema({
		actionObj: {
			type: Schema.Types.Mixed,
			required: true
		},
		queName: {
			type: String,
			required: true
		}
	},
	{
		timestamps: true, // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
		upsert: true
	}
);

CmdQueSchema.static('findByName', function (name, callback) {
	return this.find({ name: name }, callback);
});

module.exports = CmdQueSchema;
