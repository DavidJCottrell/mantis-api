const Project = require("../models/Project");

//Initials followed by 6 digits
const generateUsername = (firstName, lastName) => {
	let initials = firstName[0] + lastName[0];
	let ran = Math.floor(Math.random() * 1000000);
	return initials + ran.toString();
};

const getUserProjects = async (projectIds, userId) => {
	let userProjects = [];
	// For each of the user's project IDs
	for (const { projectId } of projectIds) {
		// Find the project
		const project = await Project.findById(projectId);
		// For each of the user's within the project
		for (const user of project.users) {
			// Get the project and their role
			if (String(user.userId) === String(userId))
				userProjects.push({
					project: project,
					role: user.role,
				});
		}
	}
	return userProjects;
};

module.exports.getUserProjects = getUserProjects;
module.exports.generateUsername = generateUsername;
