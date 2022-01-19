const Joi = require("@hapi/joi");

const registerValidation = (data) => {
	const schema = Joi.object({
		firstName: Joi.string().min(1).required(),
		lastName: Joi.string().min(1).required(),
		email: Joi.string().min(6).required().email(),
		password: Joi.string().min(6).required(),
		projects: Joi.array(),
	});
	return schema.validate(data);
};

const loginValidation = (data) => {
	const schema = Joi.object({
		email: Joi.string().min(6).required().email(),
		password: Joi.string().min(6).required(),
	});
	return schema.validate(data);
};

const createProjectValidation = (data) => {
	const schema = Joi.object({
		title: Joi.string().required(),
		users: Joi.array()
			.items({
				userId: Joi.string().required(),
				name: Joi.string().required(),
				role: Joi.string().required(),
			})
			.max(1)
			.required(),
		tasks: Joi.array().max(1),
		description: Joi.string().allow(null, ""),
		githubURL: Joi.string().allow(null, ""),
	});
	return schema.validate(data);
};

const createTaskValidation = (data) => {
	const schema = Joi.object({
		taskKey: Joi.string().required(),
		title: Joi.string().required(),
		description: Joi.string().allow(null, ""),
		type: Joi.string().required(),
		assignee: Joi.object({
			username: Joi.string().required(),
		}).required(),
		reporter: Joi.object({
			userId: Joi.string().required(),
			name: Joi.string().required(),
		}).required(),
		status: Joi.string().required(),
		resolution: Joi.string().required(),
		dateCreated: Joi.string().required(),
		dateDue: Joi.string().allow(null, ""),
	});
	return schema.validate(data);
};

module.exports.createProjectValidation = createProjectValidation;
module.exports.createTaskValidation = createTaskValidation;
module.exports.registerValidation = registerValidation;
module.exports.loginValidation = loginValidation;
