const Project = require("../models/Project");
const User = require("../models/User");

const { isLeader } = require("../utilities/auth.js");
const { createTaskValidation } = require("../utilities/validation.js");
const { ApiError } = require("../utilities/error");
const { getProjectByID } = require("./common");

const getTask = async (req, res, next) => {
	const taskId = req.params.taskId;

	const project = await getProjectByID(req.params.projectId);
	if (!project) return;

	// For each task within the given project
	for (const task of project.tasks)
		if (String(task._id) === String(taskId)) return res.status(200).json(task); // If the task with the given ID is found

	next(ApiError.recourseNotFound("No task found with that ID"));
};

const addTask = async (req, res, next) => {
	// Validate
	const { error } = createTaskValidation(req.body);
	if (error) {
		next(ApiError.badRequest(error.details[0].message));
		return;
	}

	const project = await getProjectByID(req.params.projectId);
	if (!project) return;

	if (!isLeader(req.userTokenPayload._id, project)) {
		next(ApiError.forbiddenRequest("Permission denied"));
		return;
	}

	let assignees = [];
	try {
		// for each designated assignee of the task
		for (const assignee of req.body.assignees) {
			const tempAssignee = await User.findOne({ username: assignee.username });
			assignees.push({
				userId: tempAssignee._id,
				name: tempAssignee.firstName + " " + tempAssignee.lastName,
			});
		}
	} catch (error) {
		next(ApiError.recourseNotFound("Could not find assigned task members"));
		return;
	}

	let assigneesFound = 0;
	for (const user of project.users)
		for (const assginee of assignees)
			if (String(assginee.userId) === String(user.userId)) assigneesFound += 1;

	if (assigneesFound !== assignees.length) {
		next(ApiError.badRequest("One or more members are not a member of this project."));
		return;
	}

	req.body.assignees = assignees;

	try {
		await Project.updateOne({ _id: project._id }, { $push: { tasks: [req.body] } });
	} catch (error) {
		next(ApiError.internal("Error adding task to project"));
		return;
	}

	res.status(201).json({ message: "Successfully added task to project" });
};

const removeTask = async (req, res, next) => {
	const taskId = req.params.taskId;

	const project = await getProjectByID(req.params.projectId);
	if (!project) return;

	if (!isLeader(req.userTokenPayload._id, project)) {
		next(ApiError.forbiddenRequest("Permission denied"));
		return;
	}

	// Get the task to remove
	let taskToRemove;
	for (const task of project.tasks) if (String(task._id) === String(taskId)) taskToRemove = task;
	if (!taskToRemove) {
		next(ApiError.recourseNotFound("Could not find task with that ID"));
		return;
	}

	// Get a list of all the tasks to keep
	let newTasks = [];
	for (const task of project.tasks) if (String(task._id) !== String(taskId)) newTasks.push(task);

	// Calculate new task keys
	for (let i = 0; i < newTasks.length; i++) {
		let keyNum = parseInt(newTasks[i].taskKey.match(/\d/g));
		if (keyNum >= parseInt(taskToRemove.taskKey.match(/\d/g)))
			newTasks[i].taskKey = "T" + String(keyNum - 1);
	}

	try {
		await Project.updateOne({ _id: project._id }, { $set: { tasks: newTasks } });
	} catch (error) {
		next(ApiError.internal("Error removing task from project"));
		return;
	}

	res.status(201).json({ message: "Successfully deleted task" });
};

const updateSubTasks = async (req, res, next) => {
	const taskId = req.params.taskId;
	const subTasks = req.body;

	const project = await getProjectByID(req.params.projectId);
	if (!project) return;

	let tasks = project.tasks;
	for (let i = 0; i < tasks.length; i++)
		if (String(project.tasks[i]._id) === String(taskId)) tasks[i].subtasks = subTasks;

	try {
		await Project.updateOne({ _id: project._id }, { $set: { tasks: tasks } });
	} catch (error) {
		next(ApiError.internal("Error updating subtasks"));
		return;
	}

	res.status(201).json({ message: "Successfully updated subtasks" });
};

const updateStatus = async (req, res, next) => {
	const taskId = req.params.taskId;
	const newStatus = req.body.status;

	const project = await getProjectByID(req.params.projectId);
	if (!project) return;

	let tasks = project.tasks;
	let updatedTask;

	for (let i = 0; i < tasks.length; i++) {
		if (String(tasks[i]._id) === String(taskId)) {
			tasks[i].status = newStatus;
			updatedTask = tasks[i];
		}
	}

	try {
		await Project.updateOne({ _id: project._id }, { $set: { tasks: tasks } });
	} catch (error) {
		next(ApiError.internal("Could not update project's status"));
		return;
	}

	res.status(201).json(updatedTask);
};

const getSubTasks = async (req, res, next) => {
	const taskId = req.params.taskId;

	const project = await getProjectByID(req.params.projectId);
	if (!project) return;

	for (const task of project.tasks)
		if (String(task._id) === String(taskId))
			return res.status(200).json({ subtasks: task.subtasks });

	next(ApiError.recourseNotFound("Could not find task with that ID"));
};

const updateComments = async (req, res, next) => {
	const taskId = req.params.taskId;
	const newComments = req.body;

	const project = await getProjectByID(req.params.projectId);
	if (!project) return;

	for (let i = 0; i < project.tasks.length; i++)
		if (String(project.tasks[i]._id) === String(taskId))
			project.tasks[i].comments = newComments;

	try {
		await Project.updateOne({ _id: project._id }, { $set: { tasks: project.tasks } });
	} catch (error) {
		next(ApiError.internal("Could not update comments"));
		return;
	}

	res.status(201).json({ message: "Successfully updated comments" });
};

const getComments = async (req, res, next) => {
	const taskId = req.params.taskId;

	const project = await getProjectByID(req.params.projectId);
	if (!project) return;

	for (const task of project.tasks)
		if (String(task._id) === String(taskId))
			return res.status(200).json({ comments: task.comments });

	next(ApiError.recourseNotFound("No task found with that ID"));
};

// Update resolution
const updateResolution = async (req, res, next) => {
	const taskId = req.params.taskId;
	const newResolution = req.body.resolution;

	const project = await getProjectByID(req.params.projectId);
	if (!project) return;

	let tasks = project.tasks;
	let updatedTask;

	for (let i = 0; i < tasks.length; i++)
		if (String(tasks[i]._id) === String(taskId)) {
			tasks[i].resolution = newResolution;
			updatedTask = tasks[i];
		}

	await Project.updateOne({ _id: project._id }, { $set: { tasks: tasks } });
	res.status(201).json(updatedTask);
};

module.exports = {
	getTask: getTask,
	addTask: addTask,
	removeTask: removeTask,
	updateSubTasks: updateSubTasks,
	updateStatus: updateStatus,
	updateResolution: updateResolution,
	getSubTasks: getSubTasks,
	updateComments: updateComments,
	getComments: getComments,
};
