import Select, { SelectInstance } from 'react-select';
import { ChainResult, SimilarProtein } from "../AnalyticalPage";
import { useEffect, useRef, useState } from 'react';

export type StructureOption = {
    label: string;
    value: { dataSourceName: string, pdbId: string, chain: string };
};

type Props = {
    classes?: string;
    chains: string[];
    dataSourcesSimilarProteins: Record<string, SimilarProtein[]>; // dataSourcesSimilarProteins[dataSourceName] -> similar proteins
    squashBindingSites: boolean;
    startQuerySequenceAtZero: boolean;
    isDisabled: boolean;
    onChainSelect: (selectedChain: string) => void;
    onBindingSitesSquashClick: () => void;
    onStartQuerySequenceAtZero: () => void;
    onStructuresSelect: (selectedStructureOptions: StructureOption[]) => void;
};

function SettingsPanel({
    classes = "",
    chains,
    dataSourcesSimilarProteins,
    squashBindingSites,
    startQuerySequenceAtZero,
    isDisabled,
    onChainSelect,
    onBindingSitesSquashClick,
    onStartQuerySequenceAtZero,
    onStructuresSelect
}: Props) {
    if (chains.length === 0) { // This should never happen, it is expected that at least 1 chain will be always present
        <p>No chains provided.</p>
    }
    const [selectedChain, setSelectedChain] = useState<string>(chains[0]); // We can index to chains because each protein has at least 1 chain.
    const [structureOptions, setStructureOptions] = useState<StructureOption[]>([]); // Similar proteins which can be visualised (all)
    /* By clicking on some structure options, user makes them candidates, 
     * after clicking on confirm button, they become selected structures */
    const [selectedStructureCandidates, setSelectedStructureCandidates] = useState<StructureOption[]>([]);
    const [prevSelectedStuctures, setPrevSelectedStuctures] = useState<StructureOption[]>([]);
    const structuresSelectRef = useRef<SelectInstance | null>(null);
    const [areCandidatesSameAsPrevSelection, setAreCandidatesSameAsPrevSelection] = useState<boolean>(true);

    useEffect(() => {
        structuresSelectRef.current?.clearValue(); // TODO error in console occurs when this is here

        const options: StructureOption[] = [];
        for (const [dataSourceName, similarProteins] of Object.entries(dataSourcesSimilarProteins)) {
            for (const simProt of similarProteins) {
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
                <Select defaultValue={{ label: selectedChain, chain: selectedChain }}
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

            <div className="d-flex align-items-center form-check mb-0 mr-2">
                <input type="checkbox"
                    id="squash-binding-sites"
                    className="form-check-input"
                    disabled={isDisabled}
                    checked={squashBindingSites}
                    onChange={onBindingSitesSquashClick} />
                <label className="form-check-label" htmlFor="squash-binding-sites">
                    Squash binding sites
                </label>
            </div>

            <div className="d-flex align-items-center form-check mb-0 mr-2">
                <input type="checkbox"
                    id="start-query-seq-at-zero"
                    className="form-check-input"
                    disabled={isDisabled}
                    checked={startQuerySequenceAtZero}
                    onChange={onStartQuerySequenceAtZero} />
                <label className="form-check-label" htmlFor="start-query-seq-at-zero">
                    Start query sequence at 0 (Experimental)
                </label>
            </div>

            <div className="w-100 border-top mt-2">
                {/* The pr-5 is here, otherwise when structure is selected, the settings window "jumps" in width. */}
                <div className="d-flex align-items-center mt-2 mr-2 pr-5">
                    <div className="mr-1 font-weight-bold" title="Select similar structures to visualise them.">
                        Similar structures:
                    </div>
                    <Select ref={structuresSelectRef}
                        className="w-100"
                        isDisabled={isDisabled}
                        isMulti
                        onChange={handleCandidatesSelection}
                        closeMenuOnSelect={false}
                        options={structureOptions.map(option => ({
                            label: option.label,
                            value: option.value
                        })) as any} />
                    <button className="btn btn-outline-secondary btn-sm ml-2 text-dark"
                        onClick={confirmStructureSelection}
                        disabled={areCandidatesSameAsPrevSelection}>
                        Confirm
                    </button>
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

    function handleCandidatesSelection(newStructCandidates: StructureOption[]) {
        function checkIfNewCandidatesAreSameAsPrevSelection(newCandidates: StructureOption[]) {
            if (prevSelectedStuctures.length !== newCandidates.length) {
                return false;
            }

            for (const candidate of newCandidates) {
                const candidateInPrevSelection = prevSelectedStuctures.some(prevSelectedStuct =>
                    prevSelectedStuct.value.dataSourceName === candidate.value.dataSourceName
                    && prevSelectedStuct.value.pdbId === candidate.value.pdbId
                    && prevSelectedStuct.value.chain === candidate.value.chain);
                if (!candidateInPrevSelection) {
                    return false;
                }
            }

            return true;
        }

        const areSame = checkIfNewCandidatesAreSameAsPrevSelection(newStructCandidates);
        if (areCandidatesSameAsPrevSelection !== areSame) {
            setAreCandidatesSameAsPrevSelection(areSame);
        }
        if (!areSame) {
            setSelectedStructureCandidates(newStructCandidates);
        }
    }

    function confirmStructureSelection() {
        setPrevSelectedStuctures(selectedStructureCandidates);
        setAreCandidatesSameAsPrevSelection(true);

        onStructuresSelect(selectedStructureCandidates);
    }
}

export default SettingsPanel;
