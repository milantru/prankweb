import Select, { SelectInstance } from 'react-select';
import { ChainResult, ChainResults } from "../AnalyticalPage";
import { useEffect, useRef, useState } from 'react';

export type StructureOption = {
    label: string;
    value: { dataSourceName: string, pdbId: string, chain: string };
};

type Props = {
    classes?: string;
    chainResults: ChainResults;
    squashBindingSites: boolean;
    isDisabled: boolean;
    onChainSelect: (selectedChain: string) => void;
    onBindingSitesSquashClick: () => void;
    onStructuresSelect: (selectedStructureOptions: StructureOption[]) => void;
};

function SettingsPanel({
    classes = "",
    chainResults,
    squashBindingSites,
    isDisabled,
    onChainSelect,
    onBindingSitesSquashClick,
    onStructuresSelect
}: Props) {
    const chains = Object.keys(chainResults);
    const [selectedChain, setSelectedChain] = useState<string>(chains[0]); // We can index to chains because each protein has at least 1 chain.
    const [structureOptions, setStructureOptions] = useState<StructureOption[]>([]); // Similar proteins which can be visualised
    const structuresSelectRef = useRef<SelectInstance | null>(null);

    useEffect(() => {
        structuresSelectRef.current?.clearValue(); // TODO error in console occurs when this is here

        const chainResult = chainResults[selectedChain];
        const options: StructureOption[] = [];
        for (const [dataSourceName, result] of Object.entries(chainResult.dataSourceExecutorResults)) {
            if (!result.similarProteins) {
                continue;
            }

            for (const simProt of result.similarProteins) {
                const option: StructureOption = {
                    label: `${simProt.pdbId.toUpperCase()} (chain: ${simProt.chain}, source: ${dataSourceName})`,
                    value: {
                        dataSourceName: dataSourceName,
                        pdbId: simProt.pdbId,
                        chain: simProt.chain
                    }
                };
                options.push(option);
            }
        }
        setStructureOptions(options);
    }, [selectedChain]);

    return (
        <div className={`d-flex flex-wrap justify-content-start align-items-center border rounded ${classes}`}>
            <div className="d-flex align-items-center mr-2">
                <div className="mr-1 font-weight-bold">Chains:</div>
                <Select
                    defaultValue={{ label: selectedChain, chain: selectedChain }}
                    isDisabled={isDisabled}
                    onChange={(selectedOption: any) => handleChainSelect(selectedOption.value)}
                    /* As any is used here to silence error message which seems to be irrelevant, it says
                    * the type is wrong but according to the official GitHub repo README of the package,
                    * this is how options should look like, so it should be OK. */
                    options={chains.map(chain => ({
                        label: chain,
                        value: chain
                    })) as any} />
            </div>

            <div className="form-check mb-0 mr-2">
                <input
                    type="checkbox"
                    id="squash-binding-sites"
                    className="form-check-input"
                    disabled={isDisabled}
                    checked={squashBindingSites}
                    onChange={onBindingSitesSquashClick} />
                <label className="form-check-label" htmlFor="squash-binding-sites">
                    Squash binding sites
                </label>
            </div>

            <div className="w-100">
                {/* The pr-5 is here, otherwise when structure is selected, the settings window "jumps" in width. */}
                <div className="d-flex align-items-center mt-2 mr-2 pr-5">
                    <div className="mr-1 font-weight-bold" title="Select similar structures to visualise them.">Structures:</div>
                    <Select
                        ref={structuresSelectRef}
                        className="w-100"
                        isDisabled={isDisabled}
                        isMulti
                        onChange={onStructuresSelect}
                        closeMenuOnSelect={false}
                        options={structureOptions.map(option => ({
                            label: option.label,
                            value: option.value
                        })) as any} />
                </div>
            </div>
        </div>
    );

    function handleChainSelect(newSelectedChain: string) {
        if (newSelectedChain === selectedChain) {
            return;
        }
        setSelectedChain(newSelectedChain);
        onChainSelect(newSelectedChain);
    }
}

export default SettingsPanel;
