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
 *
 * @param inputMethod - The input method (of the form) used to provide the input (e.g., structure file, PDB code, etc.).
 * @param inputBlockData - The actual input data (from the form) corresponding to the chosen method.
 * @returns An object containing a unique input ID and a user-friendly error message (empty if no error occurred).
 */
export async function uploadDataAPI(
	inputMethod: InputMethods,
	inputBlockData: InputBlockData
): Promise<{ id: string, userFriendlyErrorMessage: string }> {
	const url = `${apiBaseUrl}/upload-data`;
	const errorMessage = "Failed to upload data to the server.";

	const formData = new FormData();
	formData.append("inputMethod", inputMethod.toString());
	// Add input block data to form data
	Object.entries(inputBlockData).forEach(([key, value]) => {
		formData.append(key, value instanceof File ? value : value.toString());
	});

	try {
		const response = await axios.post<string>(url, formData, {
			headers: {
				"Content-Type": "multipart/form-data"
			}
		});

		const id = response.data;
		return { id: id, userFriendlyErrorMessage: "" };
	}
	catch (error) {
		const errMsgs = getErrorMessages(error);
		errMsgs.forEach(errMsg => console.error(errMsg));

		let message = error.response?.data?.error || errorMessage;

		return { id: "", userFriendlyErrorMessage: message };
	}
}

export enum DataStatus {
	Processing,
	Completed,
	Failed
}

type DataStatusResponse = {
	status: number;
	infoMessage: string;
	errorMessage: string;
	lastUpdated: Date;
};

/**
 * Fetches the processing status of a data source executor result by ID.
 *
 * @param dataSourceName - Name of the data source (e.g., "p2rank").
 * @param id - Unique identifier of the input.
 * @param useConservation - Whether to use conservation-enhanced data (applies to "p2rank").
 * @returns Status of the result, along with an info message (about current processing) 
 * 			and error message (empty if no error occurred).
 */
export async function getDataSourceExecutorResultStatusAPI(
	dataSourceName: string,
	id: string,
	useConservation: boolean = false
): Promise<{ status: DataStatus | null, infoMessage: string, userFriendlyErrorMessage: string }> {
	const url = dataSourceName === "p2rank" && useConservation
		? `${apiBaseUrl}/data/ds_${dataSourceName}/${id}/conservation/status.json`
		: `${apiBaseUrl}/data/ds_${dataSourceName}/${id}/status.json`;
	const errorMessage = `Failed to fetch ${dataSourceName}${dataSourceName.toLowerCase().endsWith("s") ? "'" : "'s"} status.`;

	try {
		const dataStatusResponse = await axios.get<DataStatusResponse>(url, {
			headers: {
				"Content-Type": "application/json"
			}
		});

		const status = dataStatusResponse.data.status as DataStatus;
		return { status: status, infoMessage: dataStatusResponse.data.infoMessage, userFriendlyErrorMessage: "" };
	}
	catch (error) {
		if (error?.status === 404) {
			console.warn(`Status for ${dataSourceName} and ${id} is missing. Maybe just not created yet?`);
		} else {
			const errMsgs = getErrorMessages(error);
			errMsgs.forEach(errMsg => console.error(errMsg));
		}

		return { status: null, infoMessage: "", userFriendlyErrorMessage: errorMessage };
	}
}

/**
 * Fetches the executor result for a specific data source, ID, and chain.
 *
 * @param dataSourceName - Name of the data source (e.g., "p2rank").
 * @param id - Unique identifier of the input.
 * @param chain - Chain identifier (e.g., "A").
 * @param useConservation - Whether to use conservation-enhanced data (applies to "p2rank").
 * @returns The raw result and a user-friendly error message (empty if no error occurred).
 */
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

/**
 * Retrieves conservation data for a given ID and chain.
 *
 * @param id - Unique identifier of the input.
 * @param chain - Chain identifier (e.g., "A").
 * @returns An array of conservation entries and a user-friendly error message (empty if no error occurred).
 */
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

/**
 * Retrieves all available chains for a given input ID.
 *
 * @param id - Unique identifier of the input.
 * @returns A list of chain identifiers and a user-friendly error message (empty if no error occurred).
 */
export async function getAllChainsAPI(id: string): Promise<{ chains: string[], userFriendlyErrorMessage: string }> {
	const url = `${apiBaseUrl}/data/inputs/${id}/chains.json`;
	const errorMessage = "Failed to fetch all chains.";

	try {
		const response = await axios.get(url);

		const chains: string[] = response.data["chains"];
		return { chains: chains, userFriendlyErrorMessage: "" };
	} catch (error) {
		const errMsgs = getErrorMessages(error);
		errMsgs.forEach(errMsg => console.error(errMsg));

		return { chains: [], userFriendlyErrorMessage: errorMessage };
	}
}

/**
 * Retrieves sequence-to-structure index mappings for the query protein.
 *
 * @param id - Unique identifier of the input.
 * @returns A mapping from sequence indices to structure indices per chain, 
 * 			and a user-friendly error message (empty if no error occurred).
 */
export async function getQuerySeqToStrMappingsAPI(
	id: string
): Promise<{ seqToStrMappings: Record<string, Record<number, number>>, userFriendlyErrorMessage: string }> {
	const url = `${apiBaseUrl}/data/inputs/${id}/chains.json`;
	const errorMessage = "Failed to fetch sequence to structure mappings for query protein.";

	try {
		const response = await axios.get(url);

		// Mapping for query protein, seqToStrMappings[chain][seqIdx] -> structIdx
		const seqToStrMappings: Record<string, Record<number, number>> = response.data["seqToStrMapping"];
		return { seqToStrMappings: seqToStrMappings, userFriendlyErrorMessage: "" };
	} catch (error) {
		const errMsgs = getErrorMessages(error);
		errMsgs.forEach(errMsg => console.error(errMsg));

		return { seqToStrMappings: {}, userFriendlyErrorMessage: errorMessage };
	}
}

/**
 * Retrieves amino acid chain identifiers for a given PDB code.
 *
 * @param pdbCode - Four-character PDB identifier.
 * @returns A list of polypeptide chain identifiers and a user-friendly error message (empty if no error occurred).
 */
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
		/* startsWith("polypeptide") is there to target only amino acid chains, 
		 * we don't want e.g. 6XEZ chain T, because it is DNA chain */
		data[pdbCode.toLowerCase()]
			.filter(entity => entity["sequence"])
			.filter(entity => entity["molecule_type"] && entity["molecule_type"].startsWith("polypeptide"))
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
