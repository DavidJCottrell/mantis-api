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

// Accept an invitation (adds user to project)
router.post("/accept", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.body.projectId);
		const userToAdd = await User.findById(req.body.userId);

		if (userToAdd === null)
			return res.status(400).send("User does not exist");
		for (existingUser of project.users) {
			if (String(userToAdd._id) === String(existingUser.userId))
				return res
					.status(400)
					.send("This user is already a member of this project");
		}

		userToAdd.projects.push({ projectId: project._id });
		project.users.push({
			userId: userToAdd._id,
			name: userToAdd.firstName + " " + userToAdd.lastName,
			username: userToAdd.username,
			role: req.body.role,
		});

		userToAdd.save();
		project.save();

		res.status(201).json({
			message: "Successfully added user to project",
		});
	} catch (error) {
		res.json({ message: error });
	}
});

// Create new invitation to project
router.post("/addinvitation/:username", verifyToken, async (req, res) => {
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

		// Check user doesnt already exist in project
		for (existingUser of project.users) {
			if (String(invitedUser._id) === String(existingUser.userId))
				return res
					.status(400)
					.send("This user is already a member of this project");
		}

		if (
			await Invitation.findOne({
				"invitee.userId": invitedUser._id,
			})
		) {
			return res.status(400).send("This user has already been invited");
		}

		// Create object for invited user's details
		const invitee = {
			userId: invitedUser._id,
			name: invitedUser.firstName + " " + invitedUser.lastName,
			username: invitedUser.username,
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
