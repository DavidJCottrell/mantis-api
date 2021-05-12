const express = require("express");
const router = express.Router();
const User = require("../models/User");
const verify = require("./verifyToken");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { registerValidation, loginValidation } = require("../validation.js");

// router.get("/", async (req, res) => {
// 	try {
// 		const users = await User.find();
// 		res.json(users);
// 	} catch (error) {
// 		res.json({
// 			message: error,
// 		});
// 	}
// });

// Returns a specific user
router.get("/", verify, async (req, res) => {
	try {
		const user = await User.findById(req.user._id);
		res.json({
			user,
		});
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
		email: req.body.email,
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
	res.header("auth-token", token).send(token);
});

module.exports = router;
