import { toast } from "react-toastify";

/** Displays toast to the user with provided text. */
export const toastWarning = (text: string) => {
    // Default color of progress bar is overwritten in index.css 
    toast.warn(text);
};
