const mongoose = require("mongoose");

const InvitationSchema = mongoose.Schema({
	invitee: {
		type: String,
		required: true,
	},
	inviter: {
		type: String,
		required: true,
	},
	projectTitle: {
		type: String,
		required: true,
	},
	projectId: {
		type: mongoose.SchemaTypes.ObjectId,
		required: true,
	},
	role: {
		type: String,
		required: true,
	},
});

module.exports = mongoose.model("invitations", InvitationSchema);
