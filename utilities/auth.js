const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Checks if the supplied auth token is valid
const verifyToken = async (req, res, next) => {
	try {
		const token = req.header("auth-token");
		if (!token) return res.status(401).send("Access Denied");

		const verified = jwt.verify(token, process.env.TOKEN_SECRET);
		req.userTokenPayload = verified;

		const user = await User.findById(req.userTokenPayload._id);
		if (!user) res.status(401).send("User Does Not Exist");

		next();
	} catch (err) {
		res.status(401).send("Invalid Token");
	}
};

// Get the role the user has for the specified project
const getRole = (userId, project) => {
	for (const projectMember of project.users)
		if (String(userId) === String(projectMember.userId)) return projectMember.role;
	return null;
};

const isLeader = async (userId, project) => {
	if (getRole(userId, project) !== "Team Leader") return false;
	else return true;
};

module.exports = {
	verifyToken,
	isLeader,
	getRole,
};
