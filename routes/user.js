const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Project = require("../models/Project");
const verify = require("./verifyToken");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { registerValidation, loginValidation } = require("../validation.js");

// Returns all the projects belonging to a specific user (based on their token)
router.get("/projects", verify, async (req, res) => {
	try {
		const { projects } = await User.findById(req.user._id);

		let projectsData = [];

		for (const projectId of projects) {
			const project = await Project.findById(projectId._id);
			// Incase a delete project's ID still exisits with user
			if (project !== null) projectsData.push(project);
		}

		res.json(projectsData);
	} catch (error) {
		res.json({
			message: error,
		});
	}
});

// Returns details for a specific user (based on their token)
// router.get("/details", verify, async (req, res) => {
// 	try {
// 		const user = await User.findById(req.user._id);
// 		res.json(user);
// 	} catch (error) {
// 		res.json({
// 			message: error,
// 		});
// 	}
// });

// Add a project for which that user is a member of
// router.patch("/addproject/:projectId", verify, async (req, res) => {
// 	try {
// 		const user = await User.findById(req.user._id);

// 		let exists = false;

// 		// Check if user is already a member of that project
// 		for (project of user.projects)
// 			exists = project._id === req.params.projectId ? true : false;

// 		if (exists)
// 			return res
// 				.status(400)
// 				.json({ message: "User is already a member of this project" });

// 		user.projects.push({ _id: req.params.projectId });
// 		user.save();
// 		res.json({ message: "Successfully added project to user" });
// 	} catch (error) {
// 		res.json({ message: error });
// 	}
// });

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
		return res
			.status(400)
			.send("A user is already registered with that email address");

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
		const savedUser = await user.save();
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
	const user = await User.findOne({
		email: req.body.email.toLowerCase(),
	});
	if (!user) return res.status(400).send("Email does not exist"); // Deploy replace with: Email or password is incorrect

	// Check if password is correct
	const validPassword = await bcrypt.compare(
		req.body.password,
		user.password
	);
	if (!validPassword) return res.status(400).send("Password is incorrect"); // Deploy replace with: Email or password is incorrect

	// Create jwt
	const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET);
	res.json({
		token: token,
		user: user,
	});
	// res.header("auth-token", token).send(token);
});

module.exports = router;
