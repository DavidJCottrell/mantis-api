// Router
const express = require("express");
const router = express.Router();

// Models
const Project = require("../models/Project");
const User = require("../models/User");
const Invitation = require("../models/Invitation");

// Token and passwords
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Utility functions and errors
const { verifyToken } = require("../utilities/auth.js");
const { registerValidation, loginValidation } = require("../utilities/validation.js");
const { getUserProjects, generateUsername } = require("../utilities/common-functions");
const { ApiError } = require("../utilities/error");

// Returns all the projects belonging to a specific user (based on their token)
router.get("/projects", verifyToken, async (req, res, next) => {
	const userId = req.userTokenPayload._id;

	// Get all project IDs of projects that user is a member of
	let projectIds;
	try {
		const { projects } = await User.findById(userId);
		projectIds = projects;
	} catch (error) {
		next(ApiError.recourseNotFound("No user found with that ID"));
		return;
	}

	// Get the project data from the projectIDs
	let userProjects;
	try {
		userProjects = await getUserProjects(projectIds, userId);
	} catch (error) {
		next(ApiError.badRequest("Error getting user's projects"));
		return;
	}

	res.status(200).json(userProjects);
});

// Get all invitations for a user
router.get("/invitations", verifyToken, async (req, res, next) => {
	try {
		const invitations = await Invitation.find({ "invitee.userId": req.userTokenPayload._id });
		res.status(200).json(invitations);
		return;
	} catch (error) {
		next(ApiError.recourseNotFound("No user found with that ID"));
		return;
	}
});

// Returns all the tasks allocated to a specific user (based on their token)
router.get("/tasks", verifyToken, async (req, res, next) => {
	let projectIDs;

	try {
		// Get all project IDs of projects that user is a member of
		const { projects } = await User.findById(req.userTokenPayload._id);
		projectIDs = projects;
	} catch (error) {
		next(ApiError.recourseNotFound("No user found with that ID"));
		return;
	}

	let assignedTasks = [];
	try {
		// For each project id they are a member of
		for (const { projectId } of projectIDs) {
			const project = await Project.findById(projectId); // Get the full project from the ID
			// Check if user exisits in that project
			for (const task of project.tasks) {
				for (const assignee of task.assignees) {
					if (String(assignee.userId) === String(req.userTokenPayload._id)) {
						assignedTasks.push({
							task: task,
							parentProjectTitle: project.title,
							parentProjectId: project._id,
						});
					}
				}
			}
		}
	} catch (error) {
		next(ApiError.internal("Something went wrong"));
		return;
	}
	res.status(200).json(assignedTasks);
});

router.post("/register", async (req, res, next) => {
	// Validate
	const { error } = registerValidation(req.body);
	if (error) {
		next(ApiError.badRequest(error.details[0].message));
		return;
	}

	// Check if user exists
	if (await User.findOne({ email: req.body.email })) {
		next(ApiError.badRequest("A user is already registered with that email address"));
		return;
	}

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
});

// Login
router.post("/login", async (req, res, next) => {
	// Validate
	const { error } = loginValidation(req.body);
	if (error) {
		next(ApiError.badRequest(error.details[0].message));
		return;
	}

	// Check if user exists
	const email = req.body.email;
	let user;
	try {
		user = await User.findOne({ email: email.toLowerCase() });
	} catch (error) {
		next(ApiError.recourseNotFound("No user exists with that email address"));
		return;
	}

	// Check if password is correct
	const password = req.body.password;
	const validPassword = await bcrypt.compare(password, user.password);
	if (!validPassword) {
		next(ApiError.recourseNotFound("Password is incorrect"));
		return;
	}

	// Create jwt
	const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET, { expiresIn: "7d" });
	res.status(200).json({ token: token, user: user });
});

module.exports = router;
