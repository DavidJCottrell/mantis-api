require("dotenv/config");
const express = require("express");
const app = express();
const mongoose = require("mongoose");

//Import routes
const projectRoute = require("./routes/project");
const userRoute = require("./routes/user");

var cors = require("cors");

app.use(
	express.json(),
	cors({
		origin: ["http://localhost:3000", "http://192.168.0.98:3000"],
		default: "http://localhost:3000",
	})
);

app.use("/project", projectRoute);
app.use("/user", userRoute);

//Connect to DB
mongoose
	.connect(process.env.DB_CONNECTION, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.catch((e) => {
		console.log("Error connecting to database: ", e);
	});

app.listen(process.env.PORT, () => {
	console.log("Server is running on port " + process.env.PORT);
});

// Clear console after nodemon reload
// console.clear();
