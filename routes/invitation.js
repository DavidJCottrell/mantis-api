const express = require("express");
const router = express.Router();
const Invitation = require("../models/Invitation");
const Project = require("../models/Project");
const User = require("../models/User");
const { verifyToken } = require("./auth.js");
const { createInviteValidation } = require("../validation.js");

// Get all invitations for a user

// Delete an invitation

// Accept an invitation

// Create new invitation to project
router.post("/sendinvite/:username", verifyToken, async (req, res) => {
	try {
		const invitedUser = await User.findOne({
			username: req.params.username,
		});

		// Check user exsists
		if (!invitedUser) {
			res.status(404).json({
				message: "User not found",
			});
		}

		// Validate invite data
		const { error } = createInviteValidation(req.body);
		if (error) return res.status(400).send(error.details[0].message);

		console.log(invitedUser);

		const invitation = new Invitation({
			projectTitle: req.body.projectTitle,
			projectId: req.body.projectId,
			role: req.body.role,
			inviter: req.body.inviter,
			invitee: invitedUser.firstName + " " + invitedUser.lastName,
		});
		await invitation.save();

		res.status(201).json({
			message: "Successfully invited user",
		});
	} catch (e) {
		console.log(e);
	}
});

module.exports = router;
