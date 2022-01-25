const mongoose = require("mongoose");

const ProjectSchema = mongoose.Schema({
	title: {
		type: String,
		required: true,
	},
	users: {
		type: [
			{
				userId: {
					type: mongoose.SchemaTypes.ObjectId,
					required: true,
				},
				name: {
					type: String,
					required: true,
				},
				username: {
					type: String,
					required: true,
				},
				role: {
					type: String,
					enum: ["Team Leader", "Developer", "Client"],
					required: true,
				},
				_id: false,
			},
		],
		validate: (users) => Array.isArray(users) && users.length > 0,
	},
	tasks: [
		{
			taskKey: { type: String, required: true },
			title: { type: String, required: true },
			description: { type: String },
			type: { type: String, required: true },
			assignees: [
				{
					userId: {
						type: mongoose.SchemaTypes.ObjectId,
						required: true,
					},
					name: {
						type: String,
						maxlength: 255,
						required: true,
					},
					projectRole: {
						type: String,
						maxlength: 255,
						required: true,
					},
					_id: false,
				},
			],
			reporter: {
				userId: {
					type: mongoose.SchemaTypes.ObjectId,
					required: true,
				},
				name: {
					type: String,
					maxlength: 255,
					required: true,
				},
			},
			status: { type: String, required: true },
			resolution: { type: String, required: true },
			dateCreated: { type: String, required: true },
			dateUpdated: { type: String },
			dateDue: { type: String },
			comments: [
				{
					content: { type: String, required: true },
					taggedUsers: [mongoose.Schema.Types.ObjectId],
				},
			],
			subtasks: [
				{
					columnName: { type: String, required: true },
					tasks: [
						{
							title: { type: String },
							description: { type: String },
						},
					],
				},
			],
		},
	],
	description: {
		type: String,
	},
	githubURL: {
		type: String,
	},
});

module.exports = mongoose.model("projects", ProjectSchema);
