const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());

app.get("/sprints/getSprint", (req, res, next) => {
  if (Number(req.query.SprintId) === 391) {
    const sprint = require("./mocks/getSprint391");
    res.json(sprint);
  } else {
    res.status(404).send({ msg: "Sprint not found" });
  }
});

app.listen(4000, () => {
  console.log("Server running on port 4000");
});
