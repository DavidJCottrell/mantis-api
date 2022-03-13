const express = require("express");
const router = express.Router();
const Project = require("../../models/Project");
const User = require("../../models/User");
const Invitation = require("../../models/Invitation");
const { verifyToken, getRole } = require("../auth.js");
const {
	createProjectValidation,
	createTaskValidation,
	createInviteValidation,
	addRequirementValidation,
} = require("../../validation.js");

// Get the task with the given id
router.get("/gettask/:projectId/:taskId", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);
		const taskId = req.params.taskId;

		for (const task of project.tasks)
			if (String(task._id) === String(taskId)) return res.json({ task: task });

		// Send error if not
	} catch (error) {
		res.json({ message: error });
	}
});

// Add task to project with id
router.patch("/addtask/:projectId", verifyToken, async (req, res) => {
	try {
		// Validate
		const { error } = createTaskValidation(req.body);
		if (error) return res.status(400).send(error.details[0].message);

		const project = await Project.findById(req.params.projectId);

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
		for (const user of project.users) {
			for (const assginee of assignees) {
				if (String(assginee.userId) === String(user.userId)) {
					assigneesFound += 1;
				}
			}
		}

		if (assigneesFound !== assignees.length)
			return res.status(400).send("One or more members are not a member of this project.");

		req.body.assignees = assignees;

		const updatedProject = await Project.updateOne(
			{
				_id: project._id,
			},
			{ $push: { tasks: [req.body] } }
		);
		res.status(201).json({
			message: "Successfully added task to project",
		});
	} catch (error) {
		console.log(error);
		res.json({ error });
	}
});

// Remove task
router.patch("/removetask/:projectId/:taskId", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);

		const requestingUser = await User.findById(req.user._id);
		if (getRole(requestingUser, project) !== "Team Leader")
			return res.status(400).send("Permission denied.");

		let tasks = [];
		for (const task of project.tasks)
			if (String(task._id) !== String(req.params.taskId)) tasks.push(task);

		await Project.updateOne(
			{
				_id: project._id,
			},
			{ $set: { tasks: tasks } }
		);

		res.status(201).json({
			message: "Successfully deleted task",
		});
	} catch (error) {
		res.json({ error });
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

		await Project.updateOne(
			{
				_id: project._id,
			},
			{ $set: { tasks: tasks } }
		);
		res.status(201).json({
			message: "Successfully updated subtasks",
		});
	} catch (error) {
		res.json({ message: error });
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

		for (let i = 0; i < tasks.length; i++)
			if (String(tasks[i]._id) === String(taskId)) {
				tasks[i].status = newStatus;
				updatedTask = tasks[i];
			}

		await Project.updateOne(
			{
				_id: project._id,
			},
			{ $set: { tasks: tasks } }
		);
		res.json({ task: updatedTask });
	} catch (error) {
		res.json({ message: error });
	}
});

// Get all the subtasks for a given project
router.get("/subtasks/:projectId/:taskId", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);
		const taskId = req.params.taskId;

		for (const task of project.tasks) {
			if (String(task._id) === String(taskId)) {
				return res.json({ subtasks: task.subtasks });
			}
		}

		// Send error if not
	} catch (error) {
		res.json({ message: error });
	}
});

// Add comment to a given task
// Needs validation
router.post("/comments/addcomment/:projectId/:taskId", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);
		const taskId = req.params.taskId;
		const comment = req.body;

		let tasks = [];

		for (let i = 0; i < project.tasks.length; i++) {
			if (String(project.tasks[i]._id) === String(taskId))
				project.tasks[i].comments.push(comment);
			tasks.push(project.tasks[i]);
		}

		await Project.updateOne(
			{
				_id: project._id,
			},
			{ $set: { tasks: tasks } }
		);
		res.status(201).json({
			message: "Successfully added requirement to project",
		});
	} catch (error) {
		res.json({
			message: error,
		});
	}
});

// Get all comments for a given task
router.get("/comments/:projectId/:taskId", verifyToken, async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);
		const taskId = req.params.taskId;

		for (const task of project.tasks)
			if (String(task._id) === String(taskId)) return res.json({ comments: task.comments });
	} catch (error) {
		res.json({
			message: error,
		});
	}
});

module.exports = router;
