const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const User = require("../models/User");
const { verifyToken, getRole } = require("./auth.js");
const {
	createProjectValidation,
	createTaskValidation,
} = require("../validation.js");

// Add a user to project
router.post("/adduser", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.body.projectId);
		const userToAdd = await User.findOne({ username: req.body.username });

		if (userToAdd === null)
			return res.status(400).send("User does not exist");
		for (existingUser of project.users) {
			if (String(userToAdd._id) === String(existingUser.userId))
				return res
					.status(400)
					.send("This user is already a member of this project");
		}

		const requestingUser = await User.findById(req.user._id);

		if (getRole(requestingUser, project) !== "Team Leader")
			return res.status(400).send("Permission denied.");

		userToAdd.projects.push({ _id: project._id });
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
			// id: project._id,
		});
	} catch (error) {
		res.json({ message: error });
	}
});

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
		const savedProject = await project.save();

		user.projects.push({ _id: project._id });
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
router.get("/:projectId", verifyToken, async (req, res) => {
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

router.delete("/:projectId", verifyToken, async (req, res) => {
	const user = await User.findById(req.user._id);
	try {
		const removedProject = await Project.remove({
			_id: req.params.projectId,
		});

		var removedProjIdList = user.projects.filter((projID) => {
			if (String(projID._id) !== String(req.params.projectId))
				return projID._id;
		});
		user.projects = removedProjIdList;
		user.save();

		res.json({ removedProject });
	} catch (error) {
		res.json({ error });
	}
});

// Update project
router.patch("/:projectId", verifyToken, async (req, res) => {
	try {
		const updatedProject = await Project.updateOne(
			{
				_id: req.params.projectId,
			},
			{ $set: { title: req.body.title } }
		);
		res.json({ updatedProject });
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

		req.body.assignees = assignees;

		const updatedProject = await Project.updateOne(
			{
				_id: req.params.projectId,
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

module.exports = router;
