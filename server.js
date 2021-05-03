require("dotenv/config");
const express = require("express");
const app = express();
const mongoose = require("mongoose");

//Import routes
const projectsRoute = require("./routes/projects");
const usersRoute = require("./routes/users");

app.use(express.json());

app.use("/projects", projectsRoute);
app.use("/users", usersRoute);

//Connect to DB
mongoose
	.connect(process.env.DB_CONNECTION, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.catch(() => {
		console.log("Error connecting to database");
	});

app.listen(process.env.PORT);

console.clear(); // Clear console after nodemon reload
