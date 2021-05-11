const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { registerValidation } = require("../validation.js");

router.get("/", async (req, res) => {
	try {
		const users = await User.find();
		res.json(users);
	} catch (error) {
		res.json({ message: error });
	}
});

//returns a specific user
router.get("/:userId", async (req, res) => {
	try {
		const user = await User.findById(req.params.userId);
		res.json({ user });
	} catch (error) {
		res.json({ message: error });
	}
});

router.post("/register", async (req, res) => {
	// Validate
	const { error } = registerValidation(req.body);
	if (error) return res.status(400).send(error.details[0].message);

	// Check if user exists
	const emailExists = await User.findOne({ email: req.body.email });
	if (emailExists) return res.status(400).send("A user is already registered with that email address");

	// Hash password
	const salt = await bcrypt.genSalt(10);
	const hashedPassword = await bcrypt.hash(req.body.password, salt);

	// Create new user
	const user = new User({
		name: req.body.name,
		email: req.body.email,
		password: hashedPassword,
		username: "321",
	});

	try {
		const savedUser = await user.save();
		res.status(201).json({ message: "Successfully registered" });
	} catch (error) {
		console.log("Error saving:", error);
		res.json({ message: error });
	}
});

module.exports = router;
