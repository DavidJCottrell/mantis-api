const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
	name: {
		type: String,
		required: true,
		min: 4,
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
	date: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model("users", UserSchema);
