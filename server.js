require("dotenv/config");
const express = require("express");
const app = express();
const mongoose = require("mongoose");

//Import routes
const projectRoute = require("./routes/project_routes/project");
const taskRoute = require("./routes/project_routes/task");
const requirementRoute = require("./routes/project_routes/requirement");
const userRoute = require("./routes/user");
const invitationRoute = require("./routes/invitation");

var cors = require("cors");

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

//Connect to DB
mongoose
	.connect(process.env.DB_CONNECTION, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => console.log("Connected to database successfully"))
	.catch((e) => {
		console.log("Error connecting to database: ", e);
	});

app.listen("9000", () => {
	console.log("Server is running on port " + "9000");
});
