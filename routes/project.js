const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const User = require("../models/User");
const { verifyToken, getRole } = require("./auth.js");
const {
	createProjectValidation,
	createTaskValidation,
} = require("../validation.js");

//returns all the projects in the database (if you're verified) (should be removed)
// router.get("/all", verifyToken, async (req, res) => {
// 	try {
// 		const projects = await Project.find();
// 		res.json(projects);
// 	} catch (error) {
// 		res.json({ message: error });
// 	}
// });

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

//Create project
router.post("/add", verifyToken, async (req, res) => {
	const user = await User.findById(req.user._id);

	req.body.users = [
		{
			userId: String(user._id),
			name: user.firstName + " " + user.lastName,
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

//returns a specific project
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

//Update project
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

		const assignee = await User.findOne({
			username: req.body.assignee.username,
		});

		req.body.assignee = {
			userId: String(assignee._id),
			name: assignee.firstName + " " + assignee.lastName,
		};

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
