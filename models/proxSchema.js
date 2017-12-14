const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

const ProxSchema = new Schema({
		_id: Number,
		unitId: {
			type: Number,
			required: true
		},
		kmDistance: {
			type: Number,
			required: true
		},
		cmdObj: {
			type: Schema.Types.Mixed,
			required: true
		},
		enabled: {
			type: Boolean,
			default: true
		}
	},
	{
		timestamps: true,
		upsert: true
	}
);

ProxSchema.statics.findAndModify = function (query, sort, doc, options, callback) {
	return this.collection.findAndModify(query, sort, doc, options, callback);
};

module.exports = ProxSchema;
