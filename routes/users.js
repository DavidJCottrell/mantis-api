const express = require("express");
const router = express.Router();
const { verifyToken } = require("../utilities/auth.js");
const {
	getProjects,
	getInvitations,
	getTasks,
	register,
	login,
	removeUser,
	test,
} = require("../controllers/users");

// Prefix: /users

// Returns all the projects belonging to a specific user (based on their token)
router.get("/projects", verifyToken, getProjects);

// Get all invitations for a user
router.get("/invitations", verifyToken, getInvitations);

// Returns all the tasks allocated to a specific user (based on their token)
router.get("/tasks", verifyToken, getTasks);

// Create a new user
router.post("/register", register);

// Remove a current user
router.delete("/remove", verifyToken, removeUser);

// Login
router.post("/login", login);

module.exports = router;
