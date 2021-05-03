const mongoose = require("mongoose");

const ProjectSchema = mongoose.Schema({
	title: {
		type: String,
		required: true,
	},
	users: {
		type: [
			{
				userId: mongoose.SchemaTypes.ObjectId,
				role: String,
				_id: false,
			},
		],
		validate: (usersArr) => Array.isArray(usersArr) && usersArr.length > 0,
	},
	tasks: [
		{
			taskKey: { type: String },
			title: { type: String },
			description: { type: String },
			type: { type: String },
			assignee: mongoose.Schema.Types.ObjectId,
			reporter: mongoose.Schema.Types.ObjectId,
			status: { type: String },
			resolution: { type: String },
			dateCreated: { type: String },
			dateUpdated: { type: String },
			comments: [
				{
					content: { type: String },
					taggedUsers: [mongoose.Schema.Types.ObjectId],
				},
			],
			subtasks: [
				{
					columnName: { type: String },
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
