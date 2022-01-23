const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
	firstName: {
		type: String,
		required: true,
		min: 1,
		max: 255,
	},
	lastName: {
		type: String,
		required: true,
		min: 1,
		max: 255,
	},
	email: {
		type: String,
		required: true,
		min: 6,
		max: 255,
	},
	username: {
		type: String,
		required: true,
	},
	password: {
		type: String,
		required: true,
		min: 6,
		max: 1024,
	},
	projects: {
		type: Array,
		default: [],
	},
	// invitations: [
	// 	{
	// 		title: { type: String, required: true },
	// 		role: { type: String, required: true },
	// 		from: { type: String, required: true },
	// 		projectId: { type: mongoose.SchemaTypes.ObjectId, required: true },
	// 	},
	// ],
	date: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model("users", UserSchema);
