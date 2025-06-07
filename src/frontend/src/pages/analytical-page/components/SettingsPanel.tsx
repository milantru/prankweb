import Select, { SelectInstance } from 'react-select';
import { SimilarProtein } from "../AnalyticalPage";
import { useEffect, useRef, useState } from 'react';
import "./SettingsPanel.tsx.css";

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
    dataSourceDisplayNames: Record<string, string>;
    isDisabled: boolean;
    onChainSelect: (selectedChain: string) => void;
    onBindingSitesSquashClick: () => void;
    onStartQuerySequenceAtZero: () => void;
    onStructuresSelect: (selectedStructureOptions: StructureOption[]) => void;
    onExport: () => void;
};

function SettingsPanel({
    classes = "",
    chains,
    dataSourcesSimilarProteins,
    squashBindingSites,
    startQuerySequenceAtZero,
    dataSourceDisplayNames,
    isDisabled,
    onChainSelect,
    onBindingSitesSquashClick,
    onStartQuerySequenceAtZero,
    onStructuresSelect,
    onExport
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
        structuresSelectRef.current?.clearValue();

        const options: (StructureOption & { tmScore: number })[] = [];
        for (const [dataSourceName, similarProteins] of Object.entries(dataSourcesSimilarProteins)) {
            for (const simProt of similarProteins) {
                // Displays only first 3 numbers after floating point, e.g. instead of 0.9987, it displays just 0.998
                const tmScoreTruncated = Math.floor(simProt.tmScore * 1000) / 1000;
                const option: StructureOption & { tmScore: number } = {
                    label: `${simProt.pdbId.toUpperCase()} (chain: ${simProt.chain}, source: ${dataSourceDisplayNames[dataSourceName]}) | TM score: ${tmScoreTruncated}`,
                    value: {
                        dataSourceName: dataSourceName,
                        pdbId: simProt.pdbId,
                        chain: simProt.chain
                    },
                    tmScore: simProt.tmScore
                };
                options.push(option);
            }
        }

        // Sort to display from highest tmScore
        options.sort((a, b) => b.tmScore - a.tmScore);

        // Map to remove temporary tmScore property
        setStructureOptions(options.map<StructureOption>(({ tmScore, ...structureOption }) => structureOption));
    }, [dataSourcesSimilarProteins]);

    return (
        <div className={`d-flex flex-column justify-content-start align-items-center border rounded ${classes}`}>
            <div className="d-flex flex-row flex-wrap w-100">
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

                <div className="d-flex align-items-center form-check mb-0 mr-2 plankweb-checkbox-wrapper">
                    <div>
                        <label className="form-check-label d-flex align-items-center gap-2 plankweb-checkbox">
                            <input
                                type="checkbox"
                                id="squash-binding-sites"
                                className="plankweb-checkbox-input"
                                disabled={isDisabled}
                                checked={squashBindingSites}
                                onChange={onBindingSitesSquashClick}
                            />
                            <span className="plankweb-checkbox-box">
                                <svg className="checkmark" viewBox="0 0 24 24">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </span>
                            Squash binding sites
                        </label>
                    </div>
                </div>

                <div className="d-flex align-items-center form-check mb-0 mr-2 plankweb-checkbox-wrapper">
                    <div>
                        <label className="form-check-label d-flex align-items-center gap-2 plankweb-checkbox" style={{ flexDirection: 'row' }}>
                            <input
                                type="checkbox"
                                id="start-query-seq-at-zero"
                                className="plankweb-checkbox-input"
                                disabled={isDisabled}
                                checked={startQuerySequenceAtZero}
                                onChange={onStartQuerySequenceAtZero}
                            />
                            <span className="plankweb-checkbox-box">
                                <svg className="checkmark" viewBox="0 0 24 24">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                                <small style={{ fontSize: '0.7rem', color: '#6c757d', marginBottom: 2 }}>Experimental</small>
                                <span>Start query sequence at 0</span>
                            </div>
                        </label>
                    </div>
                </div>

                <button className="btn btn-outline-secondary ml-auto"
                    title="Export the current view to JSON."
                    type="button"
                    onClick={onExport}
                    disabled={isDisabled}>
                    <i className="bi bi-download"></i>
                </button>
            </div>

            <div id="similar-proteins-select" className="w-100 d-flex border-top mt-2 pt-2 align-items-center">
                <div className="mr-1 font-weight-bold" title="Select similar structures to visualise them.">
                    Similar structures:
                </div>
                <Select ref={structuresSelectRef}
                    className="w-100"
                    styles={{
                        valueContainer: (provided: any) => ({
                            ...provided,
                            maxHeight: "65px",
                            overflowY: "auto",
                            flexWrap: "wrap",   // Keep tags wrapping
                        }),
                    }}
                    isDisabled={isDisabled}
                    isMulti
                    onChange={handleCandidatesSelection}
                    closeMenuOnSelect={false}
                    options={structureOptions.map(option => ({
                        label: option.label,
                        value: option.value
                    })) as any} />
                <button className="btn btn-outline-secondary btn-sm text-dark"
                    onClick={confirmStructureSelection}
                    disabled={areCandidatesSameAsPrevSelection}>
                    Confirm
                </button>
            </div>
        </div>
    );

    function handleChainSelect(newSelectedChain: string) {
        if (newSelectedChain === selectedChain) {
            return;
        }
        setSelectedChain(newSelectedChain);
        setPrevSelectedStuctures([]);
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
