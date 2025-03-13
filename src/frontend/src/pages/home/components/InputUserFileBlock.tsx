import { ChangeEvent, useState } from "react";
import { sanitizeChains } from "../../../shared/helperFunctions/validation";

export type InputUserFileBlockData = {
    userFile: File | null;
    chains: string;
    userInputModel: UserInputModel;
};

export enum UserInputModel {
    Default,
    ConservationHmm,
    Alphafold,
    AlphafoldConservationHmm,
}

type Props = {
    data: InputUserFileBlockData;
    setData: (data: InputUserFileBlockData) => void;
    setErrorMessage: (errorMessage: string) => void;
};

function InputUserFileBlock({ data, setData, setErrorMessage }: Props) {
    const [useSpaceAsComma, setUseSpaceAsComma] = useState<boolean>(false);

    return (
        <div id="input-user-file-block">
            <div className="mb-3">
                <label htmlFor="user-file" className="form-label">
                    Structure file (PDB/mmCIF) with biologically relevant unit
                </label>
                <input className="form-control" type="file" id="user-file" onChange={handleFileChange} />
            </div>
            <div className="mb-3">
                <label htmlFor="user-file-chains" className="form-label">Restrict to chains</label>
                <input type="text"
                    className="form-control"
                    style={useSpaceAsComma ? { border: "2px solid #0d6efd", boxShadow: "0 0 10px #0d6efd" } : {}}
                    id="user-file-chains"
                    name="userFileChains"
                    placeholder="A,B"
                    title="Optional. Comma separated list of chains to analyze."
                    value={data.chains}
                    onChange={e => setData({ ...data, chains: sanitizeChainsWrapper(e.target.value) })} />
            </div>
            <div>
                <input type="radio" name="user-input-model" id="user-input-model-1"
                    value={UserInputModel.Default} onChange={selectUserInputModel}
                    checked={data.userInputModel === UserInputModel.Default}
                    title="If selected, a default prediction model will be used." />
                <label htmlFor="user-input-model-1" className="form-label">Default prediction model</label><br />

                <input type="radio" name="user-input-model" id="user-input-model-2"
                    value={UserInputModel.ConservationHmm} onChange={selectUserInputModel}
                    checked={data.userInputModel === UserInputModel.ConservationHmm}
                    title="If selected, a default prediction model with conservation will be used." />
                <label htmlFor="user-input-model-2" className="form-label">
                    Default model with <a href="./help#conservation" target="_blank">conservation</a></label><br />

                <input type="radio" name="user-input-model" id="user-input-model-3"
                    value={UserInputModel.Alphafold} onChange={selectUserInputModel}
                    checked={data.userInputModel === UserInputModel.Alphafold}
                    title="If selected, an AlphaFold prediction model will be used." />
                <label htmlFor="user-input-model-3" className="form-label">AlphaFold model</label><br />

                <input type="radio" name="user-input-model" id="user-input-model-4"
                    value={UserInputModel.AlphafoldConservationHmm} onChange={selectUserInputModel}
                    checked={data.userInputModel === UserInputModel.AlphafoldConservationHmm}
                    title="If selected, an AlphaFold prediction model with conservation will be used." />
                <label htmlFor="user-input-model-4" className="form-label">
                    AlphaFold model with <a href="./help#conservation" target="_blank">conservation</a></label><br />
            </div>
        </div>
    );

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        if (event.target.files) {
            setData({ ...data, userFile: event.target.files[0] });
        }
    }

    function selectUserInputModel(event: ChangeEvent<HTMLInputElement>): void {
        setData({
            ...data,
            userInputModel: Number(event.target.value) as UserInputModel
        });
    }

    function sanitizeChainsWrapper(input: string): string {
        console.log(input);
        let chains = input;
        let useSpaceAsCommaTmp = useSpaceAsComma;
        if (input.toLowerCase().includes("space")) {
            chains = input.replace(/space/gi, ""); // remove space (due to gi, it replaces regardless of capitalization, e.g. "Space", "sPaCe"...)
            useSpaceAsCommaTmp = !useSpaceAsComma;
            setUseSpaceAsComma(useSpaceAsCommaTmp);
        }

        return sanitizeChains(chains, useSpaceAsCommaTmp);
    }
}

export default InputUserFileBlock;
