import { ChangeEvent, FormEvent, useState } from "react";
import InputPdbBlock, { InputPdbBlockData } from "./InputPdbBlock";
import InputUniprotBlock, { InputUniprotBlockData } from "./InputUniprotBlock";
import InputUserFileBlock, { InputUserFileBlockData, UserInputModel } from "./InputUserFileBlock";
import InputSequenceBlock, { InputSequenceBlockData } from "./InputSequenceBlock";
import { uploadData } from "../../../shared/services/apiCalls";
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
    inputBlockData: InputBlockData
};

function QueryProteinForm() {
    const [formState, setFormState] = useState<FormState>({
        inputMethod: InputMethods.InputPdbBlock,
        inputBlockData: getInputBlockInitialData(InputMethods.InputPdbBlock)
    });
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
                <div className="card-footer" id="message" style={{ display: "none" }}>
                    {/* TODO Q What is this? */}
                    {/* Messages are here. */}
                </div>
            </div>
            <div>
                <button type="submit" className="btn btn-primary float-md-end" id="submit-button">
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
                    useOriginalStructure: true,
                    useConservation: true
                };
                return inputPdbBlockData;
            case InputMethods.InputUserFileBlock:
                const inputUserFileBlockData: InputUserFileBlockData = {
                    userFile: null,
                    userFileChains: "",
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
        switch (inputMethod) {
            case InputMethods.InputPdbBlock:
                return <InputPdbBlock data={formState.inputBlockData as InputPdbBlockData}
                    setData={data => setFormState({ ...formState, inputBlockData: data })} />;
            case InputMethods.InputUserFileBlock:
                return <InputUserFileBlock data={formState.inputBlockData as InputUserFileBlockData}
                    setData={data => setFormState({ ...formState, inputBlockData: data })} />;
            case InputMethods.InputUniprotBlock:
                return <InputUniprotBlock data={formState.inputBlockData as InputUniprotBlockData}
                    setData={data => setFormState({ ...formState, inputBlockData: data })} />;
            case InputMethods.InputSequenceBlock:
                return <InputSequenceBlock data={formState.inputBlockData as InputSequenceBlockData}
                    setData={data => setFormState({ ...formState, inputBlockData: data })} />;
            default:
                throw new Error("Unknown input method.");
        }
    }

    function selectInputMethod(event: ChangeEvent<HTMLInputElement>): void {
        const newInputMethod = Number(event.target.value) as InputMethods;

        setFormState(prevState => ({
            ...prevState,
            inputMethod: newInputMethod,
            /* Changing input method will change input block in form, 
             * so let's also initialize the inout block state */
            inputBlockData: getInputBlockInitialData(newInputMethod)
        }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();

        // TODO Maybe handle error messages?
        const { id, errorMessages } = await uploadData(formState);
        if (errorMessages.length > 0) {
            console.error(errorMessages);
            return;
        }

        navigate(`/analytical-page?id=${id}`);
    }
}

export default QueryProteinForm;
