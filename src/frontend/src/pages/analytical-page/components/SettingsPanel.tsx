import Select from 'react-select';
import { ChainResult, ChainResults } from "../AnalyticalPage";
import { useEffect, useState } from 'react';

type Props = {
    chainResults: ChainResults;
    onChainSelect: (selectedChain: string) => void;
    squashBindingSites
    onBindingSitesSquashClick: () => void;
    onStructuresSelect: (selectedStructureUrls: string[]) => void;
};

function SettingsPanel({ chainResults, onChainSelect, squashBindingSites, onBindingSitesSquashClick, onStructuresSelect }: Props) {
    const chains = Object.keys(chainResults);
    const [selectedChain, setSelectedChain] = useState<string>(chains[0]); // We can index to chains because each protein has at least 1 chain.
    const [structureLabels, setStructureLabels] = useState<string[]>([]); // Similar proteins which can be visualised

    useEffect(() => {
        function getAllSimilarProteinPdbIds(chainResult: ChainResult) {
            const allPdbIds: string[] = [];

            for (const [dseName, dseResult] of Object.entries(chainResult.dataSourceExecutorResults)) {
                if (!dseResult.similarProteins) {
                    continue;
                }

                for (const simProt of dseResult.similarProteins) {
                    if (!simProt.pdbUrl) {
                        continue;
                    }
                    allPdbIds.push(simProt.pdbId);
                }

                return allPdbIds;
            }
        }

        function getStructureLabels(chainResult: ChainResult, duplicatePdbIds: string[]) {
            const structureLabelsTmp: string[] = [];

            for (const [dseName, dseResult] of Object.entries(chainResult.dataSourceExecutorResults)) {
                if (!dseResult.similarProteins) {
                    continue;
                }

                for (const simProt of dseResult.similarProteins) {
                    if (!simProt.pdbUrl) {
                        continue;
                    }

                    const pdbId = duplicatePdbIds.some(x => x.toLowerCase() === simProt.pdbId.toLowerCase())
                        ? `${simProt.pdbId.toUpperCase()} (${dseName})`
                        : simProt.pdbId.toUpperCase();

                    structureLabelsTmp.push(pdbId);
                }
            }

            return structureLabelsTmp;
        }

        const chainResult = chainResults[selectedChain];
        const allSimilarProteinPdbIds = getAllSimilarProteinPdbIds(chainResult);
        const duplicatePdbIds = getNonUniqueValues(allSimilarProteinPdbIds);
        const structureLabelsTmp = getStructureLabels(chainResult, duplicatePdbIds);

        setStructureLabels(structureLabelsTmp);
    }, [selectedChain]);

    return (<>
        <div className="d-flex align-items-center mr-2">

            <div className="mr-1 font-weight-bold">Chains:</div>
            <Select
                defaultValue={{ label: selectedChain, chain: selectedChain }}
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
                checked={squashBindingSites}
                onChange={onBindingSitesSquashClick} />
            <label className="form-check-label" htmlFor="squash-binding-sites">
                Squash binding sites
            </label>
        </div>

        <div className="w-100">
            <div className="d-flex align-items-center mt-2 mr-2">
                <div className="mr-1 font-weight-bold">Structures:</div>
                <Select
                    placeholder="Select similar structures to visualise them"
                    isMulti
                    onChange={(selectedOption: any) => handleStructureSelect(selectedOption.map(x => x.value))}
                    closeMenuOnSelect={false}
                    options={structureLabels.map(label => ({
                        label: label,
                        value: label
                    })) as any} />
            </div>
        </div>
    </>);

    function getNonUniqueValues(arr: string[]): string[] {
        const countMap = new Map<string, number>();

        for (const str of arr) {
            countMap.set(str, (countMap.get(str) || 0) + 1);
        }

        // Return only those with count > 1
        return Array.from(countMap.entries())
            .filter(([_, count]) => count > 1)
            .map(([value, _]) => value);
    }

    function handleChainSelect(selectedChain: string) {
        setSelectedChain(selectedChain);
        onChainSelect(selectedChain);
    }

    function handleStructureSelect(selectedStructures: string[]) {

        const chainResult = chainResults[selectedChain];
        const pdbUrls: string[] = [];

        for (const [dseName, dseResult] of Object.entries(chainResult.dataSourceExecutorResults)) {
            if (!dseResult.similarProteins) {
                continue;
            }

            for (const simProt of dseResult.similarProteins) {
                if (!simProt.pdbUrl || !selectedStructures.some(x => x.toLowerCase() === simProt.pdbId.toLowerCase())) {
                    continue;
                }

                pdbUrls.push(simProt.pdbUrl);
            }
        }

        onStructuresSelect(pdbUrls);
    }
}

export default SettingsPanel;
