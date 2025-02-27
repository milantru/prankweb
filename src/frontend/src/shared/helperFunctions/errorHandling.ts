import axios from "axios";

const _getErrorMessages = (error: any) => {
	const errorMessages = [];

	if (axios.isAxiosError(error)) {
		const err = error.response;
		if (Array.isArray(err?.data.errors)) {
			for (const val of err.data.errors) {
				errorMessages.push(val.description);
			}
		} else if (typeof err?.data.errors === 'object') {
			for (const key in err?.data.errors) {
				errorMessages.push(err?.data.errors[key][0]);
			}
		} else if (err?.data) {
			errorMessages.push(err.data);
		} else if (err?.status == 401) {
			errorMessages.push("Login required.");
			window.history.pushState({}, "", "/");
		} else if (err) {
			errorMessages.push(err?.data);
		}
	}

	return errorMessages;
};

export const getErrorMessages = (error: any) => {
	const originalErrorMessages = _getErrorMessages(error);
	const originalErrorMessagesCount = originalErrorMessages.length;

	const errorStringMessages = originalErrorMessages.filter(errorMessage => typeof errorMessage === "string");
	for (let i = errorStringMessages.length; i < originalErrorMessagesCount; i++) {
		errorStringMessages.push("Unknown error occurred.");
	}

	return errorStringMessages;
};
