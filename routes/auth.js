const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Checks if the supplied auth token is valid
const verifyToken = (req, res, next) => {
	const token = req.header("auth-token");
	if (!token) return res.status(401).send("Access Denied");

	try {
		const verified = jwt.verify(token, process.env.TOKEN_SECRET);
		req.user = verified;
		next();
	} catch (err) {
		res.status(400).send("Invalid Token");
	}
};

// Get the role the user has for the specified project
const getRole = (user, project) => {
	for (const projectMember of project.users) {
		if (String(user._id) === String(projectMember.userId)) return projectMember.role;
	}
	return null;
};

const isLeader = async (userId, project) => {
	const requestingUser = await User.findById(userId);
	if (getRole(requestingUser, project) !== "Team Leader") return false;
	else return true;
};

module.exports = {
	verifyToken,
	isLeader,
};
