const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	username: {
		type: String,
		required: true,
	},
	password: {
		type: String,
		required: true,
	},
	projects: {
		type: Array,
		default: [],
	},
});

module.exports = mongoose.model("users", UserSchema);
