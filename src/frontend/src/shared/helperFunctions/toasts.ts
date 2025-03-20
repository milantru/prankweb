import { toast } from "react-toastify";

export const toastWarning = (text: string) => {
    // Default color of progress bar is overwritten in index.css 
    toast.warn(text);
};
