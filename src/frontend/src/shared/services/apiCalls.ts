import axios from "axios";
import { FormState } from "../../pages/home/components/QueryProteinForm";
import { apiBaseUrl } from "../constants";
import { getErrorMessages } from "../helperFunctions/errorHandling";

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
export async function uploadData(formState: FormState): Promise<{ id: number, errorMessages: string[] }> {
	const formData = new FormData();
	formData.append("inputMethod", formState.inputMethod.toString());
	formData.append("data", JSON.stringify(formState.inputBlockData));

	try {
		const response = await axios.post<number>(apiBaseUrl + "/upload-data", formData, {
			headers: {
				"Content-Type": "multipart/form-data"
			}
		});

		const id = response.data as number;
		return { id: id, errorMessages: [] };
	}
	catch (error) {
		return { id: 0, errorMessages: getErrorMessages(error) };
	}
}
