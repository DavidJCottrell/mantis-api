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
				role: {
					type: String,
					required: true,
				},
				_id: false,
			},
		],
		validate: (usersArr) => Array.isArray(usersArr) && usersArr.length > 0,
	},
	tasks: [
		{
			taskKey: { type: String, required: true },
			title: { type: String, required: true },
			description: { type: String, required: true },
			type: { type: String, required: true },
			assignee: {
				type: mongoose.Schema.Types.ObjectId,
				required: true,
			},
			reporter: {
				type: mongoose.Schema.Types.ObjectId,
				required: true,
			},
			status: { type: String, required: true },
			resolution: { type: String, required: true },
			dateCreated: { type: String, required: true },
			dateUpdated: { type: String },
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
});

module.exports = mongoose.model("projects", ProjectSchema);
