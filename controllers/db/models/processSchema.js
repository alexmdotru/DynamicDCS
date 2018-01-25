const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

const ProcessSchema = new Schema({
		firingTime: {
			type: Date,
			default: Date.now,
			required: true
		},
		queObj: {
			type: Schema.Types.Mixed,
			required: true
		}
	},
	{
		timestamps: true,
		upsert: true
	}
);

ProcessSchema.statics.findAndModify = function (query, sort, doc, options, callback) {
	return this.collection.findAndModify(query, sort, doc, options, callback);
};

module.exports = ProcessSchema;
