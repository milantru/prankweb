import axios from "axios";
import { FormState } from "../../pages/home/components/QueryProteinForm";
import { apiBaseUrl } from "../constants";
import { getErrorMessages } from "../helperFunctions/errorHandling";
import { Result } from "../../pages/analytical-page/AnalyticalPage";
import camelcaseKeys from "camelcase-keys";

import { InputUserFileBlockData } from "../../pages/home/components/InputUserFileBlock";

/**
 * Uploads data to the server and returns a unique identifier for the input.
 *
 * Each unique input receives a corresponding unique ID. If the same input is uploaded multiple times, 
 * it will receive the same ID. However, in case of the "custom structure input method," each upload 
 * is treated as a new input, and a new ID is provided regardless of the input content.
 *
 * @param {FormState} formState - The state containing input data and the selected input method.
 * @returns {Promise<{ id: number, errorMessages: string[] }>} 
 *          - `id`: A unique identifier assigned to the input by the server.
 *          - `errorMessages`: An array of error messages if the upload fails; otherwise, an empty array.
 *
 * @throws This function does not throw errors directly; instead, errors are captured and returned in `errorMessages`.
 */
export async function uploadDataAPI(formState: FormState): Promise<{ id: number, errorMessages: string[] }> {
	const formData = new FormData();
	formData.append("input_method", formState.inputMethod.toString());
	// Add input block data to form data
	Object.entries(formState.inputBlockData).forEach(([key, value]) => {
		formData.append(key, value instanceof File ? value : value.toString());
	});
	
	console.log("Sending FormData:");
	for (let pair of formData.entries()) {
		console.log(pair[0] + ": " + pair[1]);
	}
	try {
		const response = await axios.post<number>(apiBaseUrl + "/upload-data", formData, {
			headers: {
				"Content-Type": "multipart/form-data"
			}
		});
		console.log("GOT data: " + response.data);
		const id = response.data as number;
		return { id: id, errorMessages: [] };
	}
	catch (error) {
		console.log("ERROR");
		console.log(error);
		return { id: 0, errorMessages: getErrorMessages(error) };
	}
}

export enum DataStatus {
	Processing,
	Completed,
	Failed
}

type DataStatusResponse = {
	status: number;
	errorMessages: string[];
	lastUpdated: Date;
};

export async function getDataSourceExecutorResultStatusAPI(dataSourceName: string, id: string)
	: Promise<{ status: DataStatus | null, errorMessages: string[] }> {
	try {
		console.log("STATUS")
		console.log(apiBaseUrl + `/${dataSourceName}/${id}/status.json`);
		const dataStatusResponse = await axios.get<DataStatusResponse>(apiBaseUrl + `/${dataSourceName}/${id}/status.json`, {
			headers: {
				"Content-Type": "application/json"
			}
		});
		console.log(dataStatusResponse);
		if (dataStatusResponse.data.errorMessages.length > 0) {
			return { status: null, errorMessages: dataStatusResponse.data.errorMessages };
		}

		const status = dataStatusResponse.data.status as DataStatus;
		return { status: status, errorMessages: [] };
	}
	catch (error) {
		return { status: null, errorMessages: getErrorMessages(error) };
	}
}

export async function getDataSourceExecutorResultAPI(dataSourceName: string, id: string)
	: Promise<{ results: Result[], errorMessages: string[] }> {
	try {
		const response = await axios.get<object>(apiBaseUrl + `/${dataSourceName}/${id}/${id}_result.json`, {
			headers: {
				"Content-Type": "application/json"
			}
		});
		console.log(response.data);
		const results: Result[] = camelcaseKeys(JSON.parse(JSON.stringify(response.data)), { deep: true });
		return { results, errorMessages: [] };
	}
	catch (error) {
		return { results: [], errorMessages: getErrorMessages(error) };
	}
}
