class ApiError {
	constructor(code, message) {
		this.code = code;
		this.message = message;
	}

	static badRequest(msg) {
		return new ApiError(400, msg);
	}

	static recourseNotFound(msg) {
		return new ApiError(404, msg);
	}

	static forbiddenRequest(msg) {
		return new ApiError(403, msg);
	}

	static internal(msg) {
		return new ApiError(500, msg);
	}
}

const apiErrorHandler = (err, req, res, next) => {
	if (err instanceof ApiError) {
		res.status(err.code).json(err.message);
		return;
	}
	res.status(500).json("something went wrong");
};

module.exports.ApiError = ApiError;
module.exports.apiErrorHandler = apiErrorHandler;
