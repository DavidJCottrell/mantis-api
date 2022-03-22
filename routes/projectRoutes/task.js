const express = require("express");
const router = express.Router();
const Project = require("../../models/Project");
const User = require("../../models/User");
const { verifyToken, isLeader } = require("../auth.js");
const { createTaskValidation } = require("../../validation.js");

// Get the task with the given id
router.get("/gettask/:projectId/:taskId", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);
		const taskId = req.params.taskId;

		for (const task of project.tasks)
			if (String(task._id) === String(taskId)) return res.status(200).json({ task: task });

		// Send error if not
	} catch (error) {
		res.status(400).json({ message: error });
	}
});

// Add task to project with id
router.patch("/addtask/:projectId", verifyToken, async (req, res) => {
	try {
		// Validate
		const { error } = createTaskValidation(req.body);
		if (error) return res.status(400).send(error.details[0].message);

		const project = await Project.findById(req.params.projectId);

		if (!isLeader(req.user._id, project)) return res.status(401).send("Permission denied.");

		let assignees = [];

		// for each designated assignee of the task
		for (const assignee of req.body.assignees) {
			const tempAssignee = await User.findOne({
				username: assignee.username,
			});
			assignees.push({
				userId: tempAssignee._id,
				name: tempAssignee.firstName + " " + tempAssignee.lastName,
			});
		}

		let assigneesFound = 0;
		for (const user of project.users)
			for (const assginee of assignees)
				if (String(assginee.userId) === String(user.userId)) assigneesFound += 1;

		if (assigneesFound !== assignees.length)
			return res.status(400).send("One or more members are not a member of this project.");

		req.body.assignees = assignees;

		const updatedProject = await Project.updateOne(
			{ _id: project._id },
			{ $push: { tasks: [req.body] } }
		);
		res.status(201).json({
			message: "Successfully added task to project",
		});
	} catch (error) {
		res.status(400).json({ error });
	}
});

// Remove task
router.patch("/removetask/:projectId/:taskId", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);
		const taskId = req.params.taskId;

		if (!isLeader(req.user._id, project)) return res.status(400).send("Permission denied.");

		// Get the task to remove
		let taskToRemove;
		for (const task of project.tasks)
			if (String(task._id) === String(taskId)) taskToRemove = task;

		// Get a list of all the tasks to keep
		let newTasks = [];
		for (const task of project.tasks)
			if (String(task._id) !== String(taskId)) newTasks.push(task);

		// Calculate new task keys
		for (let i = 0; i < newTasks.length; i++) {
			let keyNum = parseInt(newTasks[i].taskKey.match(/\d/g));
			if (keyNum >= parseInt(taskToRemove.taskKey.match(/\d/g)))
				newTasks[i].taskKey = "T" + String(keyNum - 1);
		}

		await Project.updateOne({ _id: project._id }, { $set: { tasks: newTasks } });

		res.status(201).json({ message: "Successfully deleted task" });
	} catch (error) {
		res.status(400).json({ error });
	}
});

// Update subtasks (add/edit/remove)
// Needs validation
router.patch("/updatesubtasks/:projectId/:taskId", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);
		const taskId = req.params.taskId;
		const subTasks = req.body;

		let tasks = project.tasks;

		for (let i = 0; i < tasks.length; i++)
			if (String(project.tasks[i]._id) === String(taskId)) tasks[i].subtasks = subTasks;

		await Project.updateOne({ _id: project._id }, { $set: { tasks: tasks } });
		res.status(201).json({ message: "Successfully updated subtasks" });
	} catch (error) {
		res.status(400).json({ error });
	}
});

// Update status
router.patch("/updatestatus/:projectId/:taskId", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);
		const taskId = req.params.taskId;
		const newStatus = req.body.status;

		let tasks = project.tasks;
		let updatedTask;

		for (let i = 0; i < tasks.length; i++) {
			if (String(tasks[i]._id) === String(taskId)) {
				tasks[i].status = newStatus;
				updatedTask = tasks[i];
			}
		}

		await Project.updateOne({ _id: project._id }, { $set: { tasks: tasks } });
		res.status(201).json({ task: updatedTask });
	} catch (error) {
		res.status(400).json({ error });
	}
});

// Update resolution
router.patch("/updateresolution/:projectId/:taskId", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);
		const taskId = req.params.taskId;
		const newResolution = req.body.resolution;

		let tasks = project.tasks;
		let updatedTask;

		for (let i = 0; i < tasks.length; i++)
			if (String(tasks[i]._id) === String(taskId)) {
				tasks[i].resolution = newResolution;
				updatedTask = tasks[i];
			}

		await Project.updateOne({ _id: project._id }, { $set: { tasks: tasks } });
		res.status(201).json({ task: updatedTask });
	} catch (error) {
		res.status(400).json({ error });
	}
});

// Get all the subtasks for a given project
router.get("/subtasks/:projectId/:taskId", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);
		const taskId = req.params.taskId;

		for (const task of project.tasks)
			if (String(task._id) === String(taskId))
				return res.status(200).json({ subtasks: task.subtasks });

		// Send error if not
	} catch (error) {
		res.status(400).json({ error });
	}
});

// Update comments (add/edit/remove)
router.patch("/comments/updatecomments/:projectId/:taskId", verifyToken, async (req, res) => {
	try {
		let project = await Project.findById(req.params.projectId);
		const taskId = req.params.taskId;
		const newComments = req.body;

		for (let i = 0; i < project.tasks.length; i++)
			if (String(project.tasks[i]._id) === String(taskId))
				project.tasks[i].comments = newComments;

		await Project.updateOne({ _id: project._id }, { $set: { tasks: project.tasks } });
		res.status(201).json({ message: "Successfully updated comments" });
	} catch (error) {
		res.status(400).json({ error });
	}
});

// Get all comments for a given task
router.get("/comments/:projectId/:taskId", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);
		const taskId = req.params.taskId;

		for (const task of project.tasks)
			if (String(task._id) === String(taskId))
				return res.status(200).json({ comments: task.comments });
	} catch (error) {
		res.status(400).json({ error });
	}
});

module.exports = router;
