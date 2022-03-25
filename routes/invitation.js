// Router
const express = require("express");
const router = express.Router();

// Models
const Invitation = require("../models/Invitation");
const Project = require("../models/Project");
const User = require("../models/User");

// Utility functions and errors
const { verifyToken, isLeader } = require("../utilities/auth.js");
const { createInviteValidation } = require("../utilities/validation.js");
const { ApiError } = require("../utilities/error");

// Delete an invitation
router.delete("/delete/:invitationId", verifyToken, async (req, res) => {
	try {
		await Invitation.deleteOne({ _id: req.params.invitationId });
		res.status(200).json({ message: "Successfully deleted invite" });
	} catch (error) {
		next(ApiError.recourseNotFound("No invitation found with that ID"));
		return;
	}
});

// Accept an invitation (adds user to project)
router.post("/accept/:invitationId", verifyToken, async (req, res) => {
	let invitation;
	try {
		invitation = await Invitation.findById(req.params.invitationId);
	} catch (error) {
		next(ApiError.recourseNotFound("No invitation found with that ID"));
		return;
	}

	let project;
	try {
		project = await Project.findById(invitation.project.projectId);
	} catch (error) {
		next(ApiError.recourseNotFound("No project found with that ID"));
		return;
	}

	let userToAdd;
	try {
		userToAdd = await User.findById(invitation.invitee.userId);
	} catch (error) {
		next(ApiError.recourseNotFound("No user found with that ID"));
		return;
	}

	// Check the user is not already a member of the project
	for (existingUser of project.users)
		if (String(userToAdd._id) === String(existingUser.userId)) {
			next(ApiError.badRequest("This user is already a member of this project"));
			return;
		}

	try {
		// Add project to user's list of project
		await User.updateOne(
			{ _id: userToAdd._id },
			{
				$push: {
					projects: [{ projectId: project._id }],
				},
			}
		);
	} catch (error) {
		next(ApiError.internal("Error adding project to user"));
		return;
	}

	try {
		// Add user to the project's list of users
		await Project.updateOne(
			{ _id: project._id },
			{
				$push: {
					users: [
						{
							userId: userToAdd._id,
							name: userToAdd.firstName + " " + userToAdd.lastName,
							username: userToAdd.username,
							role: invitation.role,
						},
					],
				},
			}
		);
	} catch (error) {
		next(ApiError.internal("Error adding user to project"));
		return;
	}

	try {
		await Invitation.deleteOne({ _id: invitation._id });
	} catch (error) {
		next(ApiError.internal("Error deleting invitation"));
		return;
	}

	res.status(201).json({ message: "Successfully added user to project" });
});

// Create new invitation to project
router.post("/addinvitation/:username", verifyToken, async (req, res) => {
	let invitedUser;
	try {
		invitedUser = await User.findOne({ username: req.params.username }); // Get the full details for the invited user
	} catch (error) {
		next(ApiError.recourseNotFound("No user found with that username"));
		return;
	}

	// Validate invite data
	const { error } = createInviteValidation(req.body);
	if (error) {
		next(ApiError.badRequest(error.details[0].message));
		return;
	}

	let project;
	try {
		project = await Project.findById(req.body.project.projectId);
	} catch (error) {
		next(ApiError.recourseNotFound("No project found with that ID"));
		return;
	}

	// User must be a Team Leader in order to create project invitations
	if (!isLeader(req.userTokenPayload._id, project)) {
		next(ApiError.forbiddenRequest("Permission denied"));
		return;
	}

	// Check user doesnt already exist in project
	for (existingUser of project.users) {
		if (String(invitedUser._id) === String(existingUser.userId)) {
			next(ApiError.badRequest("This user is already a member of this project"));
			return;
		}
	}

	if (await Invitation.findOne({ "invitee.userId": invitedUser._id })) {
		next(ApiError.badRequest("This user has already been invited"));
		return;
	}

	// Create object for invited user's details
	const invitee = {
		userId: invitedUser._id,
		name: invitedUser.firstName + " " + invitedUser.lastName,
		username: invitedUser.username,
	};

	// Add invitee object to the invitation
	req.body["invitee"] = invitee;

	// Save invitation
	const invitation = new Invitation(req.body);

	await invitation.save();

	res.status(201).json({ message: "Successfully invited user" });
});

module.exports = router;
