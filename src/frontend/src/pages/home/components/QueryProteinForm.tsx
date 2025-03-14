import { ChangeEvent, FormEvent, useState } from "react";
import InputPdbBlock, { InputPdbBlockData } from "./InputPdbBlock";
import InputUniprotBlock, { InputUniprotBlockData } from "./InputUniprotBlock";
import InputUserFileBlock, { InputUserFileBlockData, UserInputModel } from "./InputUserFileBlock";
import InputSequenceBlock, { InputSequenceBlockData } from "./InputSequenceBlock";
import { uploadDataAPI } from "../../../shared/services/apiCalls";
import { useNavigate } from "react-router-dom";

enum InputMethods {
    InputPdbBlock,
    InputUserFileBlock,
    InputUniprotBlock,
    InputSequenceBlock
}

type InputBlockData = InputPdbBlockData
    | InputUserFileBlockData
    | InputUniprotBlockData
    | InputSequenceBlockData;

export type FormState = {
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
    const navigate = useNavigate();

    return (
        <form name="input-form" onSubmit={handleSubmit}>
            <div className="card" style={{ marginTop: "2rem", marginBottom: "1rem" }}>
                <div className="card-header">
                    Please select input method
                </div>
                <div className="card-body">
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
                <button type="submit" className="btn btn-primary float-right" id="submit-button" disabled={errorMessage.length > 0}>
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

        // TODO Maybe handle error messages?
        const { id, errorMessages } = await uploadDataAPI(formState);
        if (errorMessages.length > 0) {
            console.error(errorMessages);
            return;
        }

        navigate(`/analytical-page?id=${id}`);
    }
}

export default QueryProteinForm;
