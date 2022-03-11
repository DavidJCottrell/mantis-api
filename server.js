require("dotenv/config");
const express = require("express");
const app = express();
const mongoose = require("mongoose");

//Import routes
const projectRoute = require("./routes/project");
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

app.use("/project", projectRoute);
app.use("/user", userRoute);
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

// Clear console after nodemon reload
// console.clear();
