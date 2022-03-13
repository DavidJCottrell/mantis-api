const express = require("express");
const router = express.Router();
const Project = require("../../models/Project");
const User = require("../../models/User");
const Invitation = require("../../models/Invitation");
const { verifyToken, getRole } = require("../auth.js");
const { createProjectValidation } = require("../../validation.js");

// Create project
router.post("/add", verifyToken, async (req, res) => {
	const user = await User.findById(req.user._id);

	req.body.users = [
		{
			userId: String(user._id),
			name: user.firstName + " " + user.lastName,
			username: user.username,
			role: "Team Leader",
		},
	]; // Automatically make the person who created the project the first user
	req.body.tasks = []; // Ensure no tasks are added when a project is created

	// Validate
	const { error } = createProjectValidation(req.body);
	if (error) return res.status(400).send(error.details[0].message);

	try {
		const project = new Project({
			title: req.body.title,
			users: req.body.users,
			tasks: req.body.tasks,
			description: req.body.description,
			githubURL: req.body.githubURL,
		});
		await project.save();

		user.projects.push({ projectId: project._id });
		user.save();

		res.status(201).json({
			message: "Successfully created project",
			id: project._id,
		});
	} catch (error) {
		console.log("Error saving:", error);
		res.json({ message: error });
	}
});

// Returns a specific project
router.get("/getproject/:projectId", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);

		let userExists = false;
		for (user of project.users) {
			if (req.user._id == user.userId) {
				userExists = true;
				break;
			}
		}

		if (userExists) res.json({ project });
		else res.status(400).send("User is not a memeber of this project.");
	} catch (error) {
		res.status(400).send("No project with that ID could be found.");
	}
});

// Get the user's role, based on their userId and projectId
router.get("/getrole/:projectId/:userId", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);

		for (const projectUser of project.users) {
			if (String(req.params.userId) === String(projectUser.userId)) {
				return res.json({ role: projectUser.role });
			}
		}

		res.status(400).json({ message: "User is not a memeber of this project." });
	} catch (error) {
		res.status(400).json({ message: "No project with that ID could be found." });
	}
});

// Delete project
router.delete("/delete/:projectId", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);

		// Remove project from each member's "projects" list
		for (const user of project.users) {
			await User.updateOne(
				{ _id: user.userId },
				{ $pull: { projects: { projectId: project._id } } },
				{ safe: true, multi: true }
			);
		}

		// Delete project
		await Project.remove({
			_id: project._id,
		});

		res.status(201).json({ message: "Successfully removed project" });
	} catch (error) {
		res.json({ error });
	}
});

// Get all sent invitations for a project
router.get("/invitations/:projectId", verifyToken, async (req, res) => {
	try {
		const invitations = await Invitation.find({
			"project.projectId": String(req.params.projectId),
		});
		res.json({
			invitations,
		});
	} catch (error) {
		res.json({
			message: error,
		});
	}
});

// Remove user from project
router.patch("/removeuser/:projectId/:userId", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);
		const user = await User.findById(req.params.userId);

		const requestingUser = await User.findById(req.user._id);
		if (getRole(requestingUser, project) !== "Team Leader")
			return res.status(400).send("Permission denied.");

		await Project.updateOne(
			{ _id: project._id },
			{ $pull: { users: { userId: user._id } } },
			{ safe: true, multi: true }
		);

		await User.updateOne(
			{ _id: user._id },
			{ $pull: { projects: { projectId: project._id } } },
			{ safe: true, multi: true }
		);

		res.status(201).json({
			message: "Successfully removed user",
		});
	} catch (error) {
		res.json({ error });
	}
});

module.exports = router;
