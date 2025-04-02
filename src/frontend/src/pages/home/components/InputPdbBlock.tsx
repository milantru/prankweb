import { useEffect, useState } from "react";
import { sanitizeCode, validatePdbCode } from "../../../shared/helperFunctions/validation";
import { getChainsForPdbCodeAPI } from "../../../shared/services/apiCalls";

export type InputPdbBlockData = {
    pdbCode: string;
    /* chains is a string containing comma separated values, e.g. A,B.
     * Its length is always > 0 when "Use original structure" is unchecked. 
     * When checked, it is always === "". */
    chains: string;
    useConservation: boolean;
};

type Props = {
    data: InputPdbBlockData;
    setData: (data: InputPdbBlockData) => void;
    setErrorMessage: (errorMessage: string) => void;
};

function InputPdbBlock({ data, setData, setErrorMessage }: Props) {
    const [useOriginalStructure, setUseOriginalStructure] = useState<boolean>(data.chains.length === 0);
    const [loadedChains, setLoadedChains] = useState<string[]>([]);
    const [pdbCodeOfPrevLoadedChains, setPdbCodeOfPrevLoadedChains] = useState<string | null>(null);

    useEffect(() => {
        if (!useOriginalStructure && validatePdbCode(data.pdbCode)) {
            loadPdbChains();
        }
    }, [data.pdbCode, useOriginalStructure]);

    useEffect(() => {
        if (useOriginalStructure) {
            setData({ ...data, chains: "" });
        }
    }, [useOriginalStructure]);

    return (
        <div id="input-pdb-block">
            <div className="mb-3">
                <label htmlFor="pdb-code" className="form-label">PDB Code</label>
                <input type="text" className="form-control" id="pdb-code" name="pdbCode" placeholder="2SRC"
                    title="PrankWeb will use the protein file from PDB."
                    value={data.pdbCode}
                    onChange={e => setData({ ...data, pdbCode: sanitizeCode(e.target.value) })} />
            </div>
            <div className="form-check">
                <input className="form-check-input" type="checkbox" id="pdb-seal-structure"
                    title="Uncheck to allow chain filtering."
                    checked={useOriginalStructure}
                    onChange={e => setUseOriginalStructure(!useOriginalStructure)} />
                <label className="form-check-label" htmlFor="pdb-seal-structure">
                    Use original structure
                </label>
            </div>
            {!useOriginalStructure && (
                !validatePdbCode(data.pdbCode) ? (
                    <div>Pdb code is not valid. Please enter the valid pdb code.</div>
                ) : (
                    <div id="pdb-chains" className="d-flex flex-wrap">
                        <div id="pdb-chains-label" className="mr-2">
                            {loadedChains.length === 0 ? "Loading chains from PDB ..." : "Chains (at least 1 chain must be selected):"}
                        </div>
                        <div id="pdb-chains-container" className="d-flex flex-wrap form-check-inline">
                            {loadedChains.map((chain) => (
                                <label key={chain} className="form-check-label">
                                    <input className="form-check-input"
                                        type="checkbox"
                                        name="pdb-chain-value"
                                        checked={isChainSelected(chain)}
                                        // disable if it is the last chain selected
                                        disabled={isChainSelected(chain) && data.chains.length == 1}
                                        onChange={() => toggleChain(chain)} />
                                    {`\u00A0${chain}\u00A0\u00A0`}
                                </label>
                            ))}
                        </div>
                    </div>
                )
            )}
            <div className="form-check">
                <input className="form-check-input" type="checkbox" id="conservation-pdb"
                    title="If checked, a model that exploits conservation will be used to classify protein binding sites."
                    checked={data.useConservation}
                    onChange={e => setData({ ...data, useConservation: e.target.checked })} />
                <label className="form-check-label" htmlFor="conservation-pdb">
                    Use <a href="./help#conservation" target="_blank">conservation</a>
                </label>
            </div>
        </div>
    );

    function isChainSelected(chain: string): boolean {
        const chainsTmp = data.chains.length > 0 ? data.chains.split(",") : [];

        return chainsTmp.includes(chain);
    }

    function toggleChain(chain: string) {
        let chainsTmp = data.chains.length > 0 ? data.chains.split(",") : [];
        chainsTmp = chainsTmp.includes(chain)
            ? chainsTmp.filter(c => c !== chain)
            : [...chainsTmp, chain];

        if (chainsTmp.length > 0) { // At least one chain must be selected, so don't update if we have no chains 
            setData({ ...data, chains: chainsTmp.join(",") });
        }
    };

    async function loadPdbChains() {
        setErrorMessage("");
        const pdbCode = data.pdbCode;
        if (!validatePdbCode(pdbCode)) {
            /* This function should be called only when we know the pdb code is valid, 
             * but because of defensive programming, this if exists here. */
            return;
        }

        const { chains, userFriendlyErrorMessage } = await getChainsForPdbCodeAPI(pdbCode);
        if (pdbCode !== data.pdbCode) {
            // User changed the code in a meanwhile (let "other code" handle it, we don't do anything anymore)
            return;
        }
        if (userFriendlyErrorMessage.length > 0) {
            setErrorMessage(userFriendlyErrorMessage);
            setLoadedChains([]);
            setData({ ...data, chains: "" });
            return;
        }

        setLoadedChains(chains);
        if (data.chains.length === 0 || (pdbCodeOfPrevLoadedChains !== null && pdbCodeOfPrevLoadedChains !== pdbCode)) {
            /* if either it is the first time we are loading (after unchecking "Use original structure")
             * OR (we are not loading for the first time AND we are loading for different pdb code) 
             * ...
             * If we came to the page and checked "Use original structure", we are loading for the first time, so we want to 
             * select all chains. 
             * Now let's imagine we clicked on the different input block data (e.g. InputUserFileBlock),
             * and then we came back to InputPdbBlock. If pdbCodeOfPrevLoadedChains !== null was not there, 
             * checked/unchecked chains would be overwritten (all of them would be checked). 
             * Now let's imagine we are on InputPdbBlock and we have inputted e.g. 2SRC, so we have chains loaded for 2SRC, 
             * now we input some different pdb code, e.g. 4k11, now the previous pdb code and current differs, so we 
             * load new chains, and because of pdbCodeOfPrevLoadedChains !== pdbCode, new chains will be set. */
            setData({ ...data, chains: chains.join(",") });
        }
        setPdbCodeOfPrevLoadedChains(pdbCode);
    }
}

export default InputPdbBlock;
