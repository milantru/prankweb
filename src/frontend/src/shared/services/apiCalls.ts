import axios from "axios";
import { InputBlockData, InputMethods } from "../../pages/home/components/QueryProteinForm";
import { apiBaseUrl } from "../constants";
import { getErrorMessages } from "../helperFunctions/errorHandling";
import { Result } from "../../pages/analytical-page/AnalyticalPage";
import camelcaseKeys from "camelcase-keys";

/**
 * Uploads data to the server and returns a unique identifier for the input.
 *
 * Each unique input receives a corresponding unique ID. If the same input is uploaded multiple times, 
 * it will receive the same ID. However, in case of the "custom structure input method," each upload 
 * is treated as a new input, and a new ID is provided regardless of the input content.
 */
export async function uploadDataAPI(
	inputMethod: InputMethods,
	inputBlockData: InputBlockData
): Promise<{ id: number, errorMessage: string }> {
	const formData = new FormData();
	formData.append("inputMethod", inputMethod.toString());
	// Add input block data to form data
	Object.entries(inputBlockData).forEach(([key, value]) => {
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
		return { id: id, errorMessage: "" };
	}
	catch (error) {
		const errorMessages = getErrorMessages(error);
		for (const errorMessage of errorMessages) {
			console.error(errorMessage);
		}
		const userFriendylErrorMessage = "Failed to upload data to the server.";
		return { id: 0, errorMessage: userFriendylErrorMessage };
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

export async function getDataSourceExecutorResultStatusAPI(
	dataSourceName: string,
	id: string
): Promise<{ status: DataStatus | null, errorMessages: string[] }> {
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

export async function getDataSourceExecutorResultAPI(
	dataSourceName: string,
	id: string
): Promise<{ results: Result[], errorMessages: string[] }> {
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

export async function getChainsForPdbCodeAPI(pdbCode: string): Promise<{ chains: string[], errorMessage: string }> {
	const url = `https://www.ebi.ac.uk/pdbe/api/pdb/entry/molecules/${pdbCode}`;
	const errorMessage = `Failed to fetch chains for pdb code '${pdbCode}'`;

	try {
		const response = await axios.get(url);
		const data = response.data;
		if (!data[pdbCode.toLowerCase()]) { // if no data is found for this pdbCode
			return { chains: [], errorMessage: errorMessage };
		}

		const chainsSet = new Set<string>(); // set is used to avoid duplicates
		data[pdbCode.toLowerCase()]
			.filter(entity => entity["sequence"])
			.forEach(entity =>
				entity["in_chains"].forEach(chain => chainsSet.add(chain))
			);

		return { chains: Array.from(chainsSet), errorMessage: "" };
	} catch (error) {
		return { chains: [], errorMessage: errorMessage };
	}
}
