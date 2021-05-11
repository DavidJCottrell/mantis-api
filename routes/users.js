const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Validation

const Joi = require("@hapi/joi");

const validationSchema = Joi.object({
	name: Joi.string().min(6).required(),
	email: Joi.string().min(6).required().email(),
	password: Joi.string().min(6).required(),
});

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
	const { error } = validationSchema.validate(req.body);
	if (error) return res.status(400).send(error.details[0].message);

	try {
		const user = new User({
			name: req.body.name,
			email: req.body.email,
			password: req.body.password,
			username: "321",
		});
		const savedUser = await user.save();
		res.status(201).json({ message: "Successfully registered" });
	} catch (error) {
		console.log("Error saving:", error);
		res.json({ message: error });
	}
});

module.exports = router;
