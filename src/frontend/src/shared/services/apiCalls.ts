import axios from "axios";
import { InputBlockData, InputMethods } from "../../pages/home/components/QueryProteinForm";
import { apiBaseUrl } from "../constants";
import { getErrorMessages } from "../helperFunctions/errorHandling";
import { Conservation, UnprocessedResult } from "../../pages/analytical-page/AnalyticalPage";

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
): Promise<{ id: number, userFriendlyErrorMessage: string }> {
	const url = `${apiBaseUrl}/upload-data`;
	const errorMessage = "Failed to upload data to the server.";

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
		const response = await axios.post<number>(url, formData, {
			headers: {
				"Content-Type": "multipart/form-data"
			}
		});
		console.log("GOT data: " + response.data);
		const id = response.data as number;
		return { id: id, userFriendlyErrorMessage: "" };
	}
	catch (error) {
		const errMsgs = getErrorMessages(error);
		errMsgs.forEach(errMsg => console.error(errMsg));

		return { id: 0, userFriendlyErrorMessage: errorMessage };
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
	id: string,
	useConservation: boolean = false
): Promise<{ status: DataStatus | null, userFriendlyErrorMessage: string }> {
	const url = dataSourceName === "p2rank" && useConservation
		? `${apiBaseUrl}/data/ds_${dataSourceName}/${id}/conservation/status.json`
		: `${apiBaseUrl}/data/ds_${dataSourceName}/${id}/status.json`;
	const errorMessage = `Failed to fetch ${dataSourceName}${dataSourceName.toLowerCase().endsWith("s") ? "'" : "'s"} status.`;

	try {
		console.log("STATUS")
		const dataStatusResponse = await axios.get<DataStatusResponse>(url, {
			headers: {
				"Content-Type": "application/json"
			}
		});
		console.log(dataStatusResponse);
		if (dataStatusResponse.data.errorMessages.length > 0) {
			dataStatusResponse.data.errorMessages.forEach(errMsg => console.error(errMsg));
			return { status: null, userFriendlyErrorMessage: errorMessage };
		}
		const status = dataStatusResponse.data.status as DataStatus;
		return { status: status, userFriendlyErrorMessage: "" };
	}
	catch (error) {
		if (error?.status === 404) {
			console.warn(`Status for ${dataSourceName} and ${id} is missing. Maybe just not created yet?`);
		} else {
			const errMsgs = getErrorMessages(error);
			errMsgs.forEach(errMsg => console.error(errMsg));
		}

		return { status: null, userFriendlyErrorMessage: errorMessage };
	}
}

export async function getDataSourceExecutorResultAPI(
	dataSourceName: string,
	id: string,
	chain: string,
	useConservation: boolean = false
): Promise<{ result: UnprocessedResult | null, userFriendlyErrorMessage: string }> {
	const url = dataSourceName === "p2rank" && useConservation
		? `${apiBaseUrl}/data/ds_${dataSourceName}/${id}/conservation/${chain}_chain_result.json`
		: `${apiBaseUrl}/data/ds_${dataSourceName}/${id}/${chain}_chain_result.json`;
	const errorMessage = `Failed to fetch ${dataSourceName}${dataSourceName.toLowerCase().endsWith("s") ? "'" : "'s"} result.`;

	try {
		const response = await axios.get<UnprocessedResult>(url, {
			headers: {
				"Content-Type": "application/json"
			}
		});

		return { result: response.data, userFriendlyErrorMessage: "" };
	}
	catch (error) {
		const errMsgs = getErrorMessages(error);
		errMsgs.forEach(errMsg => console.error(errMsg));

		return { result: null, userFriendlyErrorMessage: errorMessage };
	}
}

export async function getConservationsAPI(
	id: string,
	chain: string,
): Promise<{ conservations: Conservation[], userFriendlyErrorMessage: string }> {
	const url = `${apiBaseUrl}/data/conservation/${id}/input${chain}.json`;
	const errorMessage = "Failed to fetch conservation.";

	try {
		const response = await axios.get<Conservation[]>(url, {
			headers: {
				"Content-Type": "application/json"
			}
		});
		const conservations = response.data;
		return { conservations, userFriendlyErrorMessage: "" };
	}
	catch (error) {
		const errMsgs = getErrorMessages(error);
		errMsgs.forEach(errMsg => console.error(errMsg));

		return { conservations: [], userFriendlyErrorMessage: errorMessage };
	}
}

export async function getAllChainsAPI(id: string): Promise<{ chains: string[], userFriendlyErrorMessage: string }> {
	const url = `${apiBaseUrl}/data/inputs/${id}/chains.json`;
	const errorMessage = "Failed to fetch all chains.";

	try {
		const response = await axios.get(url);

		const chains = response.data["chains"];
		return { chains: chains, userFriendlyErrorMessage: "" };
	} catch (error) {
		const errMsgs = getErrorMessages(error);
		errMsgs.forEach(errMsg => console.error(errMsg));

		return { chains: [], userFriendlyErrorMessage: errorMessage };
	}
}

export async function getChainsForPdbCodeAPI(pdbCode: string): Promise<{ chains: string[], userFriendlyErrorMessage: string }> {
	const url = `https://www.ebi.ac.uk/pdbe/api/pdb/entry/molecules/${pdbCode}`;
	const errorMessage = `Failed to fetch chains for ${pdbCode}`;

	try {
		const response = await axios.get(url);
		const data = response.data;
		if (!data[pdbCode.toLowerCase()]) { // if no data is found for this pdbCode
			return { chains: [], userFriendlyErrorMessage: errorMessage };
		}

		const chainsSet = new Set<string>(); // set is used to avoid duplicates
		data[pdbCode.toLowerCase()]
			.filter(entity => entity["sequence"])
			.forEach(entity =>
				entity["in_chains"].forEach(chain => chainsSet.add(chain))
			);

		return { chains: Array.from(chainsSet), userFriendlyErrorMessage: "" };
	} catch (error) {
		const errMsgs = getErrorMessages(error);
		errMsgs.forEach(errMsg => console.error(errMsg));

		return { chains: [], userFriendlyErrorMessage: errorMessage };
	}
}
