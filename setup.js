const express = require("express");
const cors = require("cors");

const projectRoute = require("./routes/project");
const taskRoute = require("./routes/task");
const requirementRoute = require("./routes/requirement");
const userRoute = require("./routes/user");
const invitationRoute = require("./routes/invitation");

const { apiErrorHandler } = require("./utilities/error");

module.exports = function (app) {
	app.use(
		express.json(),
		cors({
			origin: ["http://localhost:3000", "http://localhost:3000"],
			default: "http://localhost:3000",
		})
	);

	// Routes relating to project functions
	app.use("/project", projectRoute);
	app.use("/project/tasks", taskRoute);
	app.use("/project/requirements", requirementRoute);

	// Routes relating to user functions
	app.use("/user", userRoute);

	// Routes relating to invitiation functions
	app.use("/invitation", invitationRoute);

	app.use(apiErrorHandler);
};
