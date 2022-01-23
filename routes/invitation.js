const express = require("express");
const router = express.Router();
const Invitation = require("../models/Invitation");
const Project = require("../models/Project");
const User = require("../models/User");
const { verifyToken, getRole } = require("./auth.js");
const { createInviteValidation } = require("../validation.js");

// Delete an invitation
router.delete("/delete/:invitationId", verifyToken, async (req, res) => {
	try {
		const invitation = await Invitation.findById(req.params.invitationId);
		const removedInvitation = await Invitation.remove({
			_id: req.params.invitationId,
		});

		res.status(200).json({
			message: "Successfully deleted invite",
		});
	} catch (error) {
		res.json({ error });
	}
});

// Accept an invitation

// Create new invitation to project
router.post("/sendinvite/:username", verifyToken, async (req, res) => {
	try {
		// Get the full details for the invited user
		const invitedUser = await User.findOne({
			username: req.params.username,
		});

		// Check the invited user exsists
		if (!invitedUser) {
			res.status(404).json({
				message: "User not found",
			});
		}

		// Validate invite data
		const { error } = createInviteValidation(req.body);
		if (error) return res.status(400).send(error.details[0].message);

		const requestingUser = await User.findById(req.user._id);
		const project = await Project.findById(req.body.project.projectId);
		if (getRole(requestingUser, project) !== "Team Leader")
			return res.status(400).send("Permission denied.");

		// Create object for invited user's details
		const invitee = {
			userId: invitedUser._id,
			name: invitedUser.firstName + " " + invitedUser.lastName,
		};

		// Add to the invitation
		req.body["invitee"] = invitee;

		// Save invitation
		const invitation = new Invitation(req.body);
		await invitation.save();

		res.status(201).json({
			message: "Successfully invited user",
		});
	} catch (e) {
		console.log(e);
	}
});

module.exports = router;
