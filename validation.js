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
		title: Joi.string().min(1).required(),
		users: Joi.array()
			.items({
				userId: Joi.string().required(),
				role: Joi.string().required(),
			})
			.max(1)
			.required(),
		tasks: Joi.array().max(1),
	});
	return schema.validate(data);
};

module.exports.createProjectValidation = createProjectValidation;

module.exports.registerValidation = registerValidation;
module.exports.loginValidation = loginValidation;
