import axios from "axios";
import { FormState } from "../../pages/home/components/QueryProteinForm";
import { apiBaseUrl } from "../constants";
import { getErrorMessages } from "../helperFunctions/errorHandling";

export async function uploadData(formState: FormState): Promise<string[]> {
    const formData = new FormData();
    formData.append("inputMethod", formState.inputMethod.toString());
    formData.append("data", JSON.stringify(formState.inputBlockData));
    
    try {
		await axios.post(apiBaseUrl + "/upload-data", formData, {
			headers: {
				"Content-Type": "multipart/form-data"
			}
		});

		return [];
	}
	catch (error) {
		return getErrorMessages(error);
	}
}
