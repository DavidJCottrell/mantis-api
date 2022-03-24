const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Project = require("../models/Project");
const Invitation = require("../models/Invitation");
const { verifyToken } = require("./auth.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { registerValidation, loginValidation } = require("../validation.js");
const { getUserProjects, generateUsername } = require("./utilities");

// Returns all the projects belonging to a specific user (based on their token)
router.get("/projects", verifyToken, async (req, res) => {
	try {
		const userId = req.user._id;
		// Get all project IDs of projects that user is a member of
		const { projects } = await User.findById(userId);

		let userProjects = await getUserProjects(projects, userId);

		res.status(200).json(userProjects);
	} catch (error) {
		res.status(400).json(error);
	}
});

// Get all invitations for a user
router.get("/invitations", verifyToken, async (req, res) => {
	try {
		const invitations = await Invitation.find({ "invitee.userId": req.user._id });
		res.status(200).json(invitations);
	} catch (error) {
		res.status(400).json({ message: error });
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
		res.status(200).json(assignedTasks);
	} catch (error) {
		res.status(400).json({ message: error });
	}
});

router.post("/register", async (req, res) => {
	try {
		// Validate
		const { error } = registerValidation(req.body);
		if (error) return res.status(400).send(error.details[0].message);

		// Check if user exists
		const emailExists = await User.findOne({ email: req.body.email });
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
			const usernameExists = await User.findOne({ username: username });
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

		await user.save();

		// Create jwt
		const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET, { expiresIn: "7d" });
		res.status(201).json({ token: token, user: user });
	} catch (error) {
		res.status(400).json({ message: error });
	}
});

// Login
router.post("/login", async (req, res) => {
	try {
		// Validate
		const { error } = loginValidation(req.body);
		if (error) return res.status(400).json({ message: error.details[0].message });

		// Check if user exists
		const email = req.body.email;
		const user = await User.findOne({ email: email.toLowerCase() });
		if (!user) return res.status(400).json("Email does not exist");

		// Check if password is correct
		const password = req.body.password;
		const validPassword = await bcrypt.compare(password, user.password);
		if (!validPassword) return res.status(400).json("Password is incorrect");

		// Create jwt
		const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET, { expiresIn: "7d" });
		res.status(200).json({ token: token, user: user });
	} catch (error) {
		res.status(400).json({ message: error });
	}
});

module.exports = router;
