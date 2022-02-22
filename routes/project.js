const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const User = require("../models/User");
const Invitation = require("../models/Invitation");
const { verifyToken, getRole } = require("./auth.js");
const {
	createProjectValidation,
	createTaskValidation,
	createInviteValidation,
	addRequirementValidation,
} = require("../validation.js");

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

// Get all requirememts for a project
router.get("/requirements/:projectId", verifyToken, async (req, res) => {
	try {
		const { requirements } = await Project.findById(req.params.projectId);
		res.json({ requirements });
	} catch (error) {
		res.json({ message: error });
	}
});

// Remove requirement from project
router.patch(
	"/removerequirement/:projectId/:requirementIndex",
	verifyToken,
	async (req, res) => {
		try {
			const project = await Project.findById(req.params.projectId);
			const index = req.params.requirementIndex;

			let requirements = [];
			for (const req of project.requirements)
				if (req.index !== index) requirements.push(req);

			await Project.updateOne(
				{
					_id: project._id,
				},
				{ $set: { requirements: requirements } }
			);
			res.status(201).json({
				message: "Successfully deleted requirement",
			});
		} catch (error) {
			res.json({ message: error });
		}
	}
);

// Remove task
router.patch("/removetask/:projectId/:taskId", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);

		const requestingUser = await User.findById(req.user._id);
		if (getRole(requestingUser, project) !== "Team Leader")
			return res.status(400).send("Permission denied.");

		let tasks = [];
		for (const task of project.tasks)
			if (String(task._id) !== String(req.params.taskId)) tasks.push(task);

		await Project.updateOne(
			{
				_id: project._id,
			},
			{ $set: { tasks: tasks } }
		);

		res.status(201).json({
			message: "Successfully deleted task",
		});
	} catch (error) {
		res.json({ error });
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

// Add task to project with id
router.patch("/addtask/:projectId", verifyToken, async (req, res) => {
	try {
		// Validate
		const { error } = createTaskValidation(req.body);
		if (error) return res.status(400).send(error.details[0].message);

		const project = await Project.findById(req.params.projectId);

		let assignees = [];

		// for each designated assignee of the task
		for (const assignee of req.body.assignees) {
			const tempAssignee = await User.findOne({
				username: assignee.username,
			});
			assignees.push({
				userId: tempAssignee._id,
				name: tempAssignee.firstName + " " + tempAssignee.lastName,
			});
		}

		let assigneesFound = 0;
		for (const user of project.users) {
			for (const assginee of assignees) {
				if (String(assginee.userId) === String(user.userId)) {
					assigneesFound += 1;
				}
			}
		}

		if (assigneesFound !== assignees.length)
			return res
				.status(400)
				.send("One or more members are not a member of this project.");

		console.log(assignees);
		req.body.assignees = assignees;

		const updatedProject = await Project.updateOne(
			{
				_id: project._id,
			},
			{ $push: { tasks: [req.body] } }
		);
		res.status(201).json({
			message: "Successfully added task to project",
		});
	} catch (error) {
		console.log(error);
		res.json({ error });
	}
});

// Add requirement to project with id
router.patch("/addrequirement/:projectId", verifyToken, async (req, res) => {
	try {
		// Validate
		const { error } = addRequirementValidation(req.body);
		if (error) return res.status(400).send(error.details[0].message);

		const project = await Project.findById(req.params.projectId);

		const updatedProject = await Project.updateOne(
			{
				_id: project._id,
			},
			{ $push: { requirements: [req.body] } }
		);
		res.status(201).json({
			message: "Successfully added requirement to project",
		});
	} catch (error) {
		console.log(error);
		res.json({ error });
	}
});

module.exports = router;
