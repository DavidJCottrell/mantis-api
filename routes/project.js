const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const verify = require("./verifyToken");
const { createProjectValidation } = require("../validation.js");

//returns all the projects in the database
router.get("/", verify, async (req, res) => {
	try {
		const projects = await Project.find();
		res.json(projects);
	} catch (error) {
		res.json({ message: error });
	}
});

//Add project
router.post("/add", async (req, res) => {
	// Validate
	const { error } = createProjectValidation(req.body);
	if (error) return res.status(400).send(error.details[0].message);

	try {
		const project = new Project({
			title: req.body.title,
			users: req.body.users,
			tasks: req.body.tasks,
		});
		const savedProject = await project.save();
		res.status(201).json({ message: "Successfully created project" });
	} catch (error) {
		console.log("Error saving:", error);
		res.json({ message: error });
	}
});

//returns a specific project
router.get("/:projectId", verify, async (req, res) => {
	const userId = req.user._id;

	try {
		const project = await Project.findById(req.params.projectId);

		let userExists = false;
		for (user of project.users) {
			if (userId == user.userId) {
				userExists = true;
				break;
			}
		}

		if (userExists) res.json({ project });
		else
			return res.json({
				message: "User is not a memeber of this project.",
			});
	} catch (error) {
		res.json({ message: "No project with that ID could be found." });
	}
});

router.delete("/:projectId", verify, async (req, res) => {
	try {
		const removedProject = await Project.remove({
			_id: req.params.projectId,
		});
		res.json({ removedProject });
	} catch (error) {
		res.json({ error });
	}
});

//Update project
router.patch("/:projectId", verify, async (req, res) => {
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

module.exports = router;
