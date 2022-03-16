const express = require("express");
const router = express.Router();
const Project = require("../../models/Project");
const User = require("../../models/User");
const { verifyToken, isLeader } = require("../auth.js");
const { addRequirementValidation } = require("../../validation.js");

// Add requirement to project with id
router.patch("/addrequirement/:projectId", verifyToken, async (req, res) => {
	try {
		// Validate
		const { error } = addRequirementValidation(req.body);
		if (error) return res.status(400).send(error.details[0].message);

		const project = await Project.findById(req.params.projectId);

		if (!isLeader(req.user._id, project)) return res.status(400).send("Permission denied.");

		const updatedProject = await Project.updateOne(
			{ _id: project._id },
			{ $push: { requirements: [req.body] } }
		);
		res.status(201).json({
			message: "Successfully added requirement to project",
		});
	} catch (error) {
		console.log(error);
		res.json({ error });
	}
});

// Update requirement
router.patch("/updaterequirement/:projectId/:requirementIndex", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);
		const index = req.params.requirementIndex;

		if (!isLeader(req.user._id, project)) return res.status(400).send("Permission denied.");

		const newRequirement = req.body;

		let requirements = [];
		for (let req of project.requirements)
			if (req.index === index) requirements.push(newRequirement);
			else requirements.push(req);

		await Project.updateOne({ _id: project._id }, { $set: { requirements: requirements } });
		res.status(201).json({ message: "Successfully deleted requirement" });
	} catch (error) {
		res.json({ message: error });
	}
});

// Remove requirement from project
router.patch("/removerequirement/:projectId/:requirementIndex", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);
		const index = req.params.requirementIndex;

		if (!isLeader(req.user._id, project)) return res.status(400).send("Permission denied.");

		let requirement;
		for (const req of project.requirements) if (req.index === index) requirement = req;

		let requirements = [];
		for (const req of project.requirements)
			if (req.index !== requirement.index) requirements.push(req);

		for (let i = 0; i < requirements.length; i++) {
			let indexNum = parseInt(requirements[i].index.match(/\d/g));
			if (indexNum > parseInt(requirement.index.match(/\d/g)))
				requirements[i].index = "REQ-" + String(indexNum - 1);
		}

		await Project.updateOne({ _id: project._id }, { $set: { requirements: requirements } });
		res.status(201).json({
			message: "Successfully deleted requirement",
		});
	} catch (error) {
		res.json({ message: error });
	}
});

// Get all requirements for a project
router.get("/getall/:projectId", verifyToken, async (req, res) => {
	try {
		const { requirements } = await Project.findById(req.params.projectId);
		res.json({ requirements });
	} catch (error) {
		res.json({ message: error });
	}
});

module.exports = router;
