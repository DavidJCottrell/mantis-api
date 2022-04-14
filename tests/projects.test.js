const request = require("supertest");
const app = require("../server");
const { expect } = require("chai");
const fs = require("fs");

const filePath = __dirname + "/test_data.json";
let { correctUsers } = JSON.parse(fs.readFileSync(filePath));

const newProject = {
	title: "Example Project",
	description: "Description for an example project",
};

let newProjectId = "";

describe("Project Route", () => {
	describe("/projects/getproject", () => {
		it(`Returns the project with a given ID if the user belongs to it`, async () => {
			const result = await request(app)
				.get("/projects/getproject/6240bef425bb730417ccc8e1")
				.set("auth-token", correctUsers.David.token);
			expect(result.statusCode).to.equal(200);
			expect(result).to.have.property("body");
			expect(result.body).to.have.property("project");
		});
	});

	describe("/projects/getrole", () => {
		it(`Returns the role of the user within the given project`, async () => {
			const result = await request(app)
				.get("/projects/getrole/6240bef425bb730417ccc8e1")
				.set("auth-token", correctUsers.David.token);
			expect(result.statusCode).to.equal(200);
			expect(result).to.have.property("body");
			expect(result.body).to.have.property("role");
			expect(result.body.role).to.eql("Team Leader");
		});
	});

	describe("/projects/add", () => {
		it(`Returns new list of projects for the creating user`, async () => {
			const result = await request(app)
				.post("/projects/add")
				.set("auth-token", correctUsers.David.token)
				.send(newProject);
			expect(result.statusCode).to.equal(201);
			expect(result).to.have.property("body");

			// Find the ID of the newly created project
			for (const bodyEl of result.body)
				if (bodyEl.project.title == newProject.title) newProjectId = bodyEl.project._id;
		});
	});

	describe("/projects/delete", () => {
		it(`Returns success message`, async () => {
			const result = await request(app)
				.delete("/projects/delete/" + newProjectId)
				.set("auth-token", correctUsers.David.token);
			expect(result.statusCode).to.equal(200);
		});
	});

	describe("/projects/invitations", () => {
		it(`Returns all invitations for a project`, async () => {
			const result = await request(app)
				.get("/projects/invitations/6252b01e33948c54b9b908dc")
				.set("auth-token", correctUsers.David.token);
			expect(result.statusCode).to.equal(200);
			expect(result).to.have.property("body");
			expect(result.body).to.be.an("array");
		});
	});
});
