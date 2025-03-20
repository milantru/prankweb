import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import InputPdbBlock, { InputPdbBlockData } from "./InputPdbBlock";
import InputUniprotBlock, { InputUniprotBlockData } from "./InputUniprotBlock";
import InputUserFileBlock, { InputUserFileBlockData, UserInputModel } from "./InputUserFileBlock";
import InputSequenceBlock, { InputSequenceBlockData } from "./InputSequenceBlock";
import { uploadDataAPI } from "../../../shared/services/apiCalls";
import { useNavigate } from "react-router-dom";
import { validatePdbCode } from "../../../shared/helperFunctions/validation";

export enum InputMethods {
    InputPdbBlock,
    InputUserFileBlock,
    InputUniprotBlock,
    InputSequenceBlock
}

export type InputBlockData = InputPdbBlockData
    | InputUserFileBlockData
    | InputUniprotBlockData
    | InputSequenceBlockData;

type FormState = {
    inputMethod: InputMethods;
    inputBlockData: Record<InputMethods, InputBlockData>
};

function QueryProteinForm() {
    const [formState, setFormState] = useState<FormState>({
        inputMethod: InputMethods.InputPdbBlock,
        inputBlockData: Object.fromEntries(
            Object.values(InputMethods)
                .filter(im => typeof im === "number") // Filter out non-numeric values (in case of reverse mapping)
                .map(im => [im, getInputBlockInitialData(im)])
        ) as Record<InputMethods, InputBlockData>
    });
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const navigate = useNavigate();

    useEffect(() => {
        setErrorMessage("");
    }, [formState])

    return (
        <form name="input-form" onSubmit={handleSubmit}>
            <div className="card" style={{ marginTop: "2rem", marginBottom: "1rem" }}>
                <div className="card-header">
                    Please select input method
                </div>
                {/* minHeight is here to avoid UI "jumping" when clicking between input methods */}
                <div className="card-body" style={{ minHeight: "230px" }}>
                    <div>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" id="input-pdb" name="input-type"
                                value={InputMethods.InputPdbBlock} onChange={selectInputMethod}
                                checked={formState.inputMethod === InputMethods.InputPdbBlock} />
                            <label className="form-check-label" htmlFor="input-pdb">
                                Experimental structure
                            </label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" id="input-user-file" name="input-type"
                                value={InputMethods.InputUserFileBlock} onChange={selectInputMethod}
                                checked={formState.inputMethod === InputMethods.InputUserFileBlock} />
                            <label className="form-check-label" htmlFor="input-user-file">
                                Custom structure
                            </label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" id="input-uniprot" name="input-type"
                                value={InputMethods.InputUniprotBlock} onChange={selectInputMethod}
                                checked={formState.inputMethod === InputMethods.InputUniprotBlock} />
                            <label className="form-check-label" htmlFor="input-uniprot">
                                AlphaFold structure
                            </label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" id="input-sequence" name="input-type"
                                value={InputMethods.InputSequenceBlock} onChange={selectInputMethod}
                                checked={formState.inputMethod === InputMethods.InputSequenceBlock} />
                            <label className="form-check-label" htmlFor="input-sequence">
                                Sequence
                            </label>
                        </div>
                    </div>
                    <hr />
                    {getInputBlock(formState.inputMethod)}
                </div>
                {errorMessage.length > 0 && (
                    <div className="card-footer" id="message">
                        {errorMessage}
                    </div>
                )}
            </div>
            <div>
                <button id="submit-button"
                    type="submit"
                    className="btn btn-primary float-right"
                    disabled={isSubmitting || !validateSelectedInputBlockData()}>
                    Submit
                </button>
            </div>
        </form>
    );

    function getInputBlockInitialData(inputMethod: InputMethods): InputBlockData {
        switch (inputMethod) {
            case InputMethods.InputPdbBlock:
                const inputPdbBlockData: InputPdbBlockData = {
                    pdbCode: "",
                    chains: "",
                    useConservation: true
                };
                return inputPdbBlockData;
            case InputMethods.InputUserFileBlock:
                const inputUserFileBlockData: InputUserFileBlockData = {
                    userFile: null,
                    chains: "",
                    userInputModel: UserInputModel.ConservationHmm
                };
                return inputUserFileBlockData;
            case InputMethods.InputUniprotBlock:
                const inputUniprotBlockData: InputUniprotBlockData = {
                    uniprotCode: "",
                    useConservation: true
                };
                return inputUniprotBlockData;
            case InputMethods.InputSequenceBlock:
                const inputSequenceBlockData: InputSequenceBlockData = {
                    sequence: "",
                    useConservation: true
                };
                return inputSequenceBlockData;
            default:
                throw new Error("Unknown input method.");
        }
    }

    function getInputBlock(inputMethod: InputMethods) {
        const setData = (data: InputBlockData) => {
            const inputBlockData = formState.inputBlockData;
            inputBlockData[inputMethod] = data;

            setFormState({ ...formState, inputBlockData: inputBlockData });
        };

        switch (inputMethod) {
            case InputMethods.InputPdbBlock:
                return <InputPdbBlock
                    data={formState.inputBlockData[inputMethod] as InputPdbBlockData}
                    setData={setData}
                    setErrorMessage={setErrorMessage} />;
            case InputMethods.InputUserFileBlock:
                return <InputUserFileBlock
                    data={formState.inputBlockData[inputMethod] as InputUserFileBlockData}
                    setData={setData}
                    setErrorMessage={setErrorMessage} />;
            case InputMethods.InputUniprotBlock:
                return <InputUniprotBlock
                    data={formState.inputBlockData[inputMethod] as InputUniprotBlockData}
                    setData={setData}
                    setErrorMessage={setErrorMessage} />;
            case InputMethods.InputSequenceBlock:
                return <InputSequenceBlock
                    data={formState.inputBlockData[inputMethod] as InputSequenceBlockData}
                    setData={setData}
                    setErrorMessage={setErrorMessage} />;
            default:
                throw new Error("Unknown input method.");
        }
    }

    function selectInputMethod(event: ChangeEvent<HTMLInputElement>): void {
        const newInputMethod = Number(event.target.value) as InputMethods;

        setFormState(prevState => ({
            ...prevState,
            inputMethod: newInputMethod
        }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        setIsSubmitting(true);

        const selectedInputBlockData = formState.inputBlockData[formState.inputMethod];
        const { id, userFriendlyErrorMessage } = await uploadDataAPI(formState.inputMethod, selectedInputBlockData);
        if (userFriendlyErrorMessage.length > 0) {
            setErrorMessage(userFriendlyErrorMessage);
            setIsSubmitting(false);
            return;
        }

        navigate(`/analytical-page?id=${id}`);
        setIsSubmitting(false);
    }

    function validateChains(chains: string) {
        return chains === "" || (chains.split(",").length > 0)
    }

    function validateSelectedInputBlockData() {
        if (errorMessage.length > 0) {
            return false;
        }

        const selectedInputMethod = formState.inputMethod as InputMethods;
        switch (selectedInputMethod) {
            case InputMethods.InputPdbBlock:
                const inputPdbBlockData = formState.inputBlockData[formState.inputMethod] as InputPdbBlockData;

                const isPdbCodeValid = inputPdbBlockData.pdbCode.length > 0 && validatePdbCode(inputPdbBlockData.pdbCode);
                const arePdbChainsValid = validateChains(inputPdbBlockData.chains);

                return isPdbCodeValid && arePdbChainsValid;
            case InputMethods.InputUserFileBlock:
                const inputUserFileBlockData = formState.inputBlockData[formState.inputMethod] as InputUserFileBlockData;

                const isUserFileValid = inputUserFileBlockData.userFile !== null && inputUserFileBlockData.userFile.size > 0;
                const areUserFileChainsValid = validateChains(inputUserFileBlockData.chains);

                return isUserFileValid && areUserFileChainsValid;
            case InputMethods.InputUniprotBlock:
                const inputUniprotBlockData = formState.inputBlockData[formState.inputMethod] as InputUniprotBlockData;

                const isUniprotCodeValid = inputUniprotBlockData.uniprotCode.length > 0;

                return isUniprotCodeValid;
            case InputMethods.InputSequenceBlock:
                const inputSequenceBlockData = formState.inputBlockData[formState.inputMethod] as InputSequenceBlockData;

                const isSequenceValid = inputSequenceBlockData.sequence.length > 0;

                return isSequenceValid;
            default:
                throw new Error("Unknown input method.");
        }
    }
}

export default QueryProteinForm;
