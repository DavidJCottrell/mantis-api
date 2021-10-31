require("dotenv/config");
const express = require("express");
const app = express();
const mongoose = require("mongoose");

//Import routes
const projectRoute = require("./routes/project");
const userRoute = require("./routes/user");

app.use(express.json());

app.use("/project", projectRoute);
app.use("/user", userRoute);

//Connect to DB
mongoose
	.connect(process.env.DB_CONNECTION, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.catch(() => {
		console.log("Error connecting to database");
	});

app.listen(process.env.PORT, () => {
	console.log("Server is running on port " + process.env.PORT);
});

// Clear console after nodemon reload
// console.clear();
