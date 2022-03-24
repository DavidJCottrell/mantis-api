const Project = require("../models/Project");

const getUserProjects = async (projectIds, userId) => {
	let userProjects = [];
	for (const { projectId } of projectIds) {
		const project = await Project.findById(projectId);
		for (const user of project.users) {
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
