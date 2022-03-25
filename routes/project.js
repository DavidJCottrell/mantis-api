// Router
const express = require("express");
const router = express.Router();

// Models
const Project = require("../models/Project");
const User = require("../models/User");
const Invitation = require("../models/Invitation");

const { verifyToken, isLeader, getRole } = require("../utilities/auth.js");
const { createProjectValidation } = require("../utilities/validation.js");
const { getUserProjects } = require("../utilities/common-functions");
const { ApiError } = require("../utilities/error");

// Create project
router.post("/add", verifyToken, async (req, res, next) => {
	let user;
	try {
		user = await User.findById(req.userTokenPayload._id);
	} catch (error) {
		next(ApiError.recourseNotFound("No project found with that ID"));
		return;
	}

	const newProject = {
		title: req.body.title,
		users: [
			{
				userId: String(user._id),
				name: user.firstName + " " + user.lastName,
				username: user.username,
				role: "Team Leader",
			},
		],
		tasks: [],
		description: req.body.description,
		githubURL: req.body.githubURL,
	};

	// Validate
	const { error } = createProjectValidation(newProject);
	if (error) {
		next(ApiError.badRequest(error.details[0].message));
		return;
	}

	// Save new project document
	const project = new Project(newProject);
	await project.save();

	// Save reference to project to the creating user's list of projects
	user.projects.push({ projectId: project._id });
	await user.save();

	// Get updated list of user's projects
	let userProjects;
	try {
		userProjects = await getUserProjects(user.projects, user.id);
	} catch (error) {
		next(ApiError.internal("Error getting user's projects"));
		return;
	}

	// Return updated list of projects
	res.status(201).json(userProjects);
});

// Returns a specific project along with the user's role
router.get("/getproject/:projectId", verifyToken, async (req, res, next) => {
	let project;
	try {
		project = await Project.findById(req.params.projectId);
	} catch (error) {
		next(ApiError.recourseNotFound("No project found with that ID"));
		return;
	}

	let userExists = false;
	for (const user of project.users) {
		if (req.userTokenPayload._id == user.userId) {
			userExists = true;
			break;
		}
	}

	if (!userExists) {
		next(ApiError.forbiddenRequest("You are not a member of this project"));
		return;
	}

	const role = getRole(req.userTokenPayload._id, project);
	if (role === null) {
		next(ApiError.internal("Error getting role"));
		return;
	}

	res.status(200).json({ project: project, role: role });
});

// Get the user's role, based on their userId and projectId
router.get("/getrole/:projectId", verifyToken, async (req, res) => {
	let project;
	try {
		project = await Project.findById(req.params.projectId);
	} catch (error) {
		next(ApiError.recourseNotFound("No project found with that ID"));
		return;
	}

	let user;
	try {
		user = await User.findById(req.userTokenPayload._id);
	} catch (error) {
		next(ApiError.recourseNotFound("No user found with that ID"));
		return;
	}

	let role = getRole(user._id, project);
	if (role === null) {
		next(ApiError.internal("Error getting role"));
		return;
	}

	return res.status(200).json({ role: role });
});

// Delete project
router.delete("/delete/:projectId", verifyToken, async (req, res) => {
	let project;
	try {
		project = await Project.findById(req.params.projectId);
	} catch (error) {
		next(ApiError.recourseNotFound("No project found with that ID"));
		return;
	}

	try {
		// Remove project from each member's "projects" list
		for (const user of project.users)
			await User.updateOne(
				{ _id: user.userId },
				{ $pull: { projects: { projectId: project._id } } },
				{ safe: true, multi: true }
			);
	} catch (error) {
		next(ApiError.internal("Error removing project from users"));
		return;
	}

	try {
		// Delete project
		await Project.deleteOne({ _id: project._id });
	} catch (error) {
		next(ApiError.internal("Error removing project"));
		return;
	}

	res.status(200).json({ message: "Successfully removed project" });
});

// Get all sent invitations for a project
router.get("/invitations/:projectId", verifyToken, async (req, res, next) => {
	try {
		const invitations = await Invitation.find({
			"project.projectId": String(req.params.projectId),
		});
		res.status(200).json({ invitations });
		return;
	} catch (error) {
		next(ApiError.recourseNotFound("No invitations found with that ID"));
		return;
	}
});

// Remove user from project
router.patch("/removeuser/:projectId/:userId", verifyToken, async (req, res) => {
	let project;
	try {
		project = await Project.findById(req.params.projectId);
	} catch (error) {
		next(ApiError.recourseNotFound("No project found with that ID"));
		return;
	}

	let user;
	try {
		user = await User.findById(req.params.userId);
	} catch (error) {
		next(ApiError.recourseNotFound("No user found with that ID"));
		return;
	}

	if (!isLeader(req.user._id, project)) {
		next(ApiError.forbiddenRequest("Permission denied"));
		return;
	}

	try {
		await Project.updateOne(
			{ _id: project._id },
			{ $pull: { users: { userId: user._id } } },
			{ safe: true, multi: true }
		);
	} catch (error) {
		next(ApiError.internal("Could not remove user from project"));
		return;
	}

	try {
		await User.updateOne(
			{ _id: user._id },
			{ $pull: { projects: { projectId: project._id } } },
			{ safe: true, multi: true }
		);
	} catch (error) {
		next(ApiError.internal("Could not remove project from user"));
		return;
	}

	res.status(200).json({ message: "Successfully removed user" });
});

// Change team member's role
router.patch("/updateuserrole/:projectId/:userId", verifyToken, async (req, res) => {
	const userId = req.params.userId;
	const newRole = req.body.role;
	let project;
	try {
		project = await Project.findById(req.params.projectId);
	} catch (error) {
		next(ApiError.recourseNotFound("No project found with that ID"));
		return;
	}

	if (!isLeader(req.user._id, project)) {
		next(ApiError.forbiddenRequest("Permission denied"));
		return;
	}

	let newUsers = [];
	for (let i = 0; i < project.users.length; i++) {
		if (String(project.users[i].userId) === String(userId)) project.users[i].role = newRole;
		newUsers.push(project.users[i]);
	}

	try {
		await Project.updateOne(
			{
				_id: project._id,
			},
			{ $set: { users: newUsers } }
		);
	} catch (error) {
		next(ApiError.internal("Could not update project's users"));
		return;
	}

	res.status(200).json({ message: "Successfully changed member's role" });
});

module.exports = router;
