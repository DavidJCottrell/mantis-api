// Models
const Project = require("../models/Project");
const User = require("../models/User");

// Validation
const { registerValidation, loginValidation } = require("../utilities/validation.js");

// Token and passwords
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const { ApiError } = require("../utilities/error");
const {
	getUserProjects,
	getUserByID,
	getUserInvitations,
	generateUsername,
} = require("../controllers/common.js");

const getProjects = async (req, res, next) => {
	const userId = req.userTokenPayload._id;

	// Get the projectIDs for the project(s) the user belongs to
	const { projects: projectIDs } = await getUserByID(userId, next);
	if (!projectIDs) return;

	// Get the project data from the projectIDs
	let userProjects = await getUserProjects(projectIDs, userId, next);
	// console.log(userProjects[0].project.tasks);
	res.status(200).json({ projects: userProjects });
};

const getInvitations = async (req, res, next) => {
	const invitations = await getUserInvitations(req.userTokenPayload._id, next);
	if (!invitations) return;

	res.status(200).json({ invitations: invitations });
};

const getTasks = async (req, res, next) => {
	// Get the projectIDs for the project(s) the user belongs to
	const { projects: projectIDs } = await getUserByID(req.userTokenPayload._id, next);
	if (!projectIDs) return;

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
	res.status(200).json({ tasks: assignedTasks });
};

const register = async (req, res, next) => {
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
		projects: [],
	});

	await user.save();

	// Create jwt
	const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET, { expiresIn: "7d" });
	res.status(201).json({ token: token, user: user });
};

const removeUser = async (req, res, next) => {
	await User.deleteOne({ _id: req.userTokenPayload._id });
	res.status(200).json({ message: "Successfully deleted user" });
};

const login = async (req, res, next) => {
	// Validate
	const { error } = loginValidation(req.body);
	if (error) {
		next(ApiError.badRequest(error.details[0].message));
		return;
	}

	const badCredentialsMsg =
		"The credentials you have provided are incorrect. Please try again...";

	// Check if user exists
	const email = req.body.email;
	let user;

	user = await User.findOne({ email: email.toLowerCase() });

	if (user === null) {
		next(ApiError.invalidCredentials(badCredentialsMsg));
		return;
	}

	// Check if password is correct
	const password = req.body.password;
	const validPassword = await bcrypt.compare(password, user.password);
	if (!validPassword) {
		next(ApiError.invalidCredentials(badCredentialsMsg));
		return;
	}

	// Create jwt
	const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET, { expiresIn: "7d" });
	res.status(200).json({ token: token, user: user });
};

const getFollowedTaskComments = async (req, res, next) => {
	await User.deleteOne({ _id: req.userTokenPayload._id });
	res.status(200).json({ message: "Successfully deleted user" });
};

module.exports = {
	getProjects: getProjects,
	getInvitations: getInvitations,
	getTasks: getTasks,
	register: register,
	login: login,
	removeUser: removeUser,
};
