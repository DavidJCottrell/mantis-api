const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Project = require("../models/Project");
const Invitation = require("../models/Invitation");
const { verifyToken } = require("./auth.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { registerValidation, loginValidation } = require("../validation.js");

// Returns all the projects belonging to a specific user (based on their token)
router.get("/projects", verifyToken, async (req, res) => {
	try {
		// Get all project IDs of projects that user is a member of
		const { projects } = await User.findById(req.user._id);

		let projectsData = [];

		for (const { projectId } of projects) {
			const project = await Project.findById(projectId);

			for (const user of project.users) {
				if (String(user.userId) === String(req.user._id))
					if (project !== null)
						// Incase a deleted project's ID still exisits with user
						projectsData.push({
							project: project,
							role: user.role,
						});
			}
		}

		res.status(200).json(projectsData);
	} catch (error) {
		res.status(400).json(error);
	}
});

// Get all invitations for a user
router.get("/invitations", verifyToken, async (req, res) => {
	try {
		const invitations = await Invitation.find({
			"invitee.userId": req.user._id,
		});
		res.json(invitations);
	} catch (error) {
		res.json({ message: error });
	}
});

// Returns all the tasks allocated to a specific user (based on their token)
router.get("/tasks", verifyToken, async (req, res) => {
	try {
		// Get all project IDs of projects that user is a member of
		const { projects } = await User.findById(req.user._id);

		let assignedTasks = [];

		// For each project id they are a member of
		for (const { projectId } of projects) {
			const project = await Project.findById(projectId); // Get the full project from the ID
			// Check if user exisits in that project
			for (const task of project.tasks) {
				for (const assignee of task.assignees) {
					if (String(assignee.userId) === String(req.user._id)) {
						assignedTasks.push({
							task: task,
							parentProjectTitle: project.title,
							parentProjectId: project._id,
						});
					}
				}
			}
		}
		res.json(assignedTasks);
	} catch (error) {
		res.json({
			message: error,
		});
	}
});

//Initials followed by 6 digits
const generateUsername = (firstName, lastName) => {
	let initials = firstName[0] + lastName[0];
	let ran = Math.floor(Math.random() * 1000000);
	return initials + ran.toString();
};

router.post("/register", async (req, res) => {
	// Ensure users does not belong to any projects when they sign up
	req.body.projects = [];
	// Validate
	const { error } = registerValidation(req.body);
	if (error) return res.status(400).send(error.details[0].message);

	// Check if user exists
	const emailExists = await User.findOne({
		email: req.body.email,
	});
	if (emailExists)
		return res.status(400).send("A user is already registered with that email address");

	// Hash password
	const salt = await bcrypt.genSalt(10);
	const hashedPassword = await bcrypt.hash(req.body.password, salt);

	// Generate Unique Username
	let notUnique = true;
	let username;
	while (notUnique) {
		username = generateUsername(req.body.firstName, req.body.lastName);
		const usernameExists = await User.findOne({
			username: username,
		});
		if (!usernameExists) notUnique = false;
	}

	// Create new user
	const user = new User({
		firstName: req.body.firstName,
		lastName: req.body.lastName,
		email: req.body.email,
		password: hashedPassword,
		username: username,
		projects: req.body.projects,
	});

	try {
		await user.save();
		res.status(201).json({
			message: "Successfully registered",
		});
	} catch (error) {
		console.log("Error saving:", error);
		res.json({
			message: error,
		});
	}
});

// Login
router.post("/login", async (req, res) => {
	// Validate
	const { error } = loginValidation(req.body);
	if (error) return res.status(400).send(error.details[0].message);

	// Check if user exists
	const email = req.body.email;
	const user = await User.findOne({
		email: email.toLowerCase(),
	});
	if (!user) return res.status(400).send("Email does not exist");

	// Check if password is correct
	const password = req.body.password;
	const validPassword = await bcrypt.compare(password, user.password);
	if (!validPassword) return res.status(400).send("Password is incorrect");

	// Create jwt
	const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET, { expiresIn: "7d" });
	res.json({
		token: token,
		user: user,
	});
});

module.exports = router;
