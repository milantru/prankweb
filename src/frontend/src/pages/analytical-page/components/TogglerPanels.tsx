import { useEffect, useState } from "react";
import TogglerPanel from "./TogglerPanel";
import { getUniqueColorForEachDataSource } from "../../../shared/helperFunctions/colors";
import { BindingSite, ChainResult } from "../AnalyticalPage";

type Props = {
    classes?: string;
    chainResult: ChainResult;
    // queryProteinBindingSitesData[dataSourceName][chain][bindingSiteId] -> true/false to show bindings site (and also ligands if available)
    queryProteinBindingSitesData: Record<string, Record<string, Record<string, boolean>>>;
    // similarProteinsBindingSitesData[dataSourceName][pdbCode][chain][bindingSiteId] -> true/false to show bindings site (and also ligands if available)
    similarProteinsBindingSitesData: Record<string, Record<string, Record<string, Record<string, boolean>>>>;
    dataSourceDisplayNames: Record<string, string>;
    isDisabled: boolean;
    onQueryProteinBindingSiteToggle: (dataSourceName: string, chain: string, bindingSiteId: string, newValue: boolean) => void;
    onSimilarProteinBindingSiteToggle: (dataSourceName: string, pdbCode: string, chain: string, bindingSiteId: string, newValue: boolean) => void;
};

function TogglerPanels({
    classes = "",
    chainResult,
    queryProteinBindingSitesData,
    similarProteinsBindingSitesData,
    dataSourceDisplayNames,
    isDisabled,
    onQueryProteinBindingSiteToggle,
    onSimilarProteinBindingSiteToggle
}: Props) {
    const [dataSourceColors, setDataSourceColors] = useState<Record<string, string> | null>(null);
    // queryProteinBindingSites[dataSourceName][bindingSiteId] -> binding site of query protein
    const [queryProteinBindingSites, setQueryProteinBindingSitesData] = useState<Record<string, Record<string, BindingSite>> | null>(null);
    // similarProteinsBindingSites[dataSourceName][pdbCode][chain][bindingSiteId] -> binding site of simialr protein
    const [similarProteinsBindingSites, setSimilarProteinsBindingSites] = useState<Record<string, Record<string, Record<string, Record<string, BindingSite>>>> | null>(null);

    useEffect(() => {
        // Init data source colors
        const dataSourceNames1 = Object.keys(queryProteinBindingSitesData);
        const dataSourceNames2 = Object.keys(similarProteinsBindingSitesData);
        const dataSourceNames = Array.from(new Set([...dataSourceNames1, ...dataSourceNames2])); // Union

        const dataSourceColorsTmp = getUniqueColorForEachDataSource(dataSourceNames);
        setDataSourceColors(dataSourceColorsTmp);
    }, [queryProteinBindingSitesData, similarProteinsBindingSitesData]);

    useEffect(() => {
        setQueryProteinBindingSitesData(null);
        setSimilarProteinsBindingSites(null);

        const queryProteinBindingSitesTmp: Record<string, Record<string, BindingSite>> = {};
        const similarProteinsBindingSitesTmp: Record<string, Record<string, Record<string, Record<string, BindingSite>>>> = {};

        for (const [dataSourceName, result] of Object.entries(chainResult.dataSourceExecutorResults)) {
            // Store binding sites of query protein
            for (const bindingSite of result.bindingSites) {
                if (!(dataSourceName in queryProteinBindingSitesTmp)) {
                    queryProteinBindingSitesTmp[dataSourceName] = {};
                }
                queryProteinBindingSitesTmp[dataSourceName][bindingSite.id] = bindingSite;
            }

            if (!result.similarProteins) {
                continue;
            }
            // Store binding sites of similar proteins
            for (const simProt of result.similarProteins) {
                if (simProt.bindingSites.length === 0) {
                    continue; // Skip if no binding sites
                }

                for (const bindingSite of simProt.bindingSites) {
                    if (!(dataSourceName in similarProteinsBindingSitesTmp)) {
                        similarProteinsBindingSitesTmp[dataSourceName] = {};
                    }
                    if (!(simProt.pdbId in similarProteinsBindingSitesTmp[dataSourceName])) {
                        similarProteinsBindingSitesTmp[dataSourceName][simProt.pdbId] = {};
                    }
                    if (!(simProt.chain in similarProteinsBindingSitesTmp[dataSourceName][simProt.pdbId])) {
                        similarProteinsBindingSitesTmp[dataSourceName][simProt.pdbId][simProt.chain] = {};
                    }

                    const chainObj = similarProteinsBindingSitesTmp[dataSourceName][simProt.pdbId][simProt.chain];

                    if (!('__tmScore' in chainObj)) {
                        chainObj.__tmScore = simProt.tmScore;
                    }

                    // Store binding site
                    chainObj[bindingSite.id] = bindingSite;
                }
            }

        }

        setQueryProteinBindingSitesData(queryProteinBindingSitesTmp);
        setSimilarProteinsBindingSites(similarProteinsBindingSitesTmp);
    }, [chainResult]);

    return (
        <div className={classes}>
            {dataSourceColors && queryProteinBindingSites && similarProteinsBindingSites && (<>
                {/* Panels for query protein */}
                {Object.entries(queryProteinBindingSitesData).map(([dataSourceName, chainRecord]) =>
                    Object.entries(chainRecord).map(([chain, bindingSiteRecord]) =>
                        dataSourceName in dataSourceColors
                        && dataSourceName in queryProteinBindingSites
                        && (
                            <TogglerPanel key={`${dataSourceName}-${chain}`}
                                title={{ chain: chain, dataSourceName: dataSourceName }}
                                dataSourceDisplayNames={dataSourceDisplayNames}
                                color={dataSourceColors[dataSourceName]}
                                bindingSiteRecord={bindingSiteRecord}
                                bindingSites={queryProteinBindingSites[dataSourceName]}
                                isDisabled={isDisabled}
                                displayLoadingAnimationWhenDisabled={true}
                                onBindingSiteToggle={(bindingSiteId, checked) =>
                                    onQueryProteinBindingSiteToggle(dataSourceName, chain, bindingSiteId, checked)} />
                        )
                    )
                )}

                {/* Panels for similar proteins */}
                {Object.entries(similarProteinsBindingSitesData).map(([dataSourceName, structureRecord]) => {
                    if (!(dataSourceName in dataSourceColors) || !(dataSourceName in similarProteinsBindingSites)) return null;

                    const chainEntries = [];

                    for (const [pdbCode, chainRecord] of Object.entries(structureRecord)) {
                        for (const [chain, bindingSiteRecord] of Object.entries(chainRecord)) {
                            const simChainData = similarProteinsBindingSites[dataSourceName]?.[pdbCode]?.[chain];
                            if (!simChainData) continue;

                            const tmScore = simChainData.__tmScore ?? 0;
                            chainEntries.push({ pdbCode, chain, bindingSiteRecord, tmScore });
                        }
                    }

                    chainEntries.sort((a, b) => b.tmScore - a.tmScore);

                    return chainEntries.map(({ pdbCode, chain, bindingSiteRecord, tmScore }) => (
                        <TogglerPanel
                            key={`${dataSourceName}-${pdbCode}-${chain}`}
                            title={{ pdbCode, chain, dataSourceName, tmScore }}
                            color={dataSourceColors[dataSourceName]}
                            dataSourceDisplayNames={dataSourceDisplayNames}
                            bindingSiteRecord={bindingSiteRecord}
                            bindingSites={similarProteinsBindingSites[dataSourceName][pdbCode][chain]}
                            isDisabled={isDisabled}
                            displayLoadingAnimationWhenDisabled={true}
                            onBindingSiteToggle={(bindingSiteId, checked) =>
                                onSimilarProteinBindingSiteToggle(dataSourceName, pdbCode, chain, bindingSiteId, checked)}
                        />
                    ));
                })}

            </>)}
        </div>
    );
}

export default TogglerPanels;
