const request = require("supertest");
const app = require("../server");
const { expect } = require("chai");

// Integration tests?

let users = {
	david: {
		email: "david@gmail.com",
		password: "password1",
		token: "",
	},
	john: {
		email: "john@gmail.com",
		password: "password2",
		token: "",
	},
	fred: {
		email: "fred@gmail.com",
		password: "password3",
		token: "",
	},
};

let incorrectLoginData = {
	david: {
		email: "david@gmail.com",
		password: "pas2sword152",
	},
	john: {
		email: "notjohn@gmail.com",
		password: "password2",
	},
	fred: {
		email: "fred@gmail.com",
		password: "Password3",
	},
	nonExistentUser: {
		email: "eric@gmail.com",
		password: "password4",
	},
};

describe("User Route", () => {
	// Get token for each user before future tests
	Object.keys(users).forEach((key, index) => {
		before(async () => {
			const result = await request(app)
				.post("/users/login")
				.send({ email: users[key].email, password: users[key].password });
			users[key].token = result.body.token;
		});
	});

	describe("/user/login", () => {
		describe("User's with correct details login successfully", () => {
			// Test that each user logs in successfully
			Object.keys(users).forEach((key, index) => {
				it(`Return auth token and user details when logging in (${key})`, async () => {
					const result = await request(app)
						.post("/users/login")
						.send({ email: users[key].email, password: users[key].password });

					expect(result.statusCode).to.equal(200);
					expect(result).to.have.property("body");
					expect(result.body).to.have.property("token");
					expect(result.body).to.have.property("user");
				});
			});
		});

		describe("User's with incorrect details fail to login", () => {
			Object.keys(incorrectLoginData).forEach((key, index) => {
				it(`Return 404 when logging in with incorrect details (${key})`, async () => {
					const result = await request(app).post("/users/login").send({
						email: incorrectLoginData[key].email,
						password: incorrectLoginData[key].password,
					});

					expect(result.statusCode).to.equal(404);
					expect(result).to.have.property("body");
					expect(result.body).to.equal(
						"The credentials you have provided are incorrect. Please try again..."
					);
				});
			});
		});
	});

	describe("/user/projects", () => {
		describe("User's with valid tokens can retrieve their projects", () => {
			Object.keys(users).forEach((key, index) => {
				it(`Return user's projects based on token ${key}`, async () => {
					const result = await request(app)
						.get("/users/projects")
						.set("auth-token", users[key].token);

					expect(result.statusCode).to.equal(200);
					expect(result).to.have.property("body");
					expect(result.body).to.be.an("array");
				});
			});
		});
	});

    // describe("")
});
