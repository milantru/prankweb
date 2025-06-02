import { useEffect, useState } from "react";
import TogglerPanel from "./TogglerPanel";
import { getUniqueColorForEachDataSource } from "../../../shared/helperFunctions/colors";

type Props = {
    classes?: string;
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
    queryProteinBindingSitesData,
    similarProteinsBindingSitesData,
    dataSourceDisplayNames,
    isDisabled,
    onQueryProteinBindingSiteToggle,
    onSimilarProteinBindingSiteToggle
}: Props) {
    const [dataSourceColors, setDataSourceColors] = useState<Record<string, string> | null>(null);

    useEffect(() => {
        // Init data source colors
        const dataSourceNames1 = Object.keys(queryProteinBindingSitesData);
        const dataSourceNames2 = Object.keys(similarProteinsBindingSitesData);
        const dataSourceNames = Array.from(new Set([...dataSourceNames1, ...dataSourceNames2])); // Union

        const dataSourceColorsTmp = getUniqueColorForEachDataSource(dataSourceNames);
        setDataSourceColors(dataSourceColorsTmp);
    }, []);

    return (
        <div className={classes}>
            {dataSourceColors && (<>
                {/* Panels for query protein */}
                {Object.entries(queryProteinBindingSitesData).map(([dataSourceName, chainRecord]) =>
                    Object.entries(chainRecord).map(([chain, bindingSiteRecord]) =>
                        <TogglerPanel key={`${dataSourceName}-${chain}`}
                            title={{ chain: chain, dataSourceName: dataSourceName }}
                            dataSourceDisplayNames={dataSourceDisplayNames}
                            color={dataSourceColors[dataSourceName]}
                            bindingSiteRecord={bindingSiteRecord}
                            isDisabled={isDisabled}
                            displayLoadingAnimationWhenDisabled={true}
                            onBindingSiteToggle={(bindingSiteId, checked) =>
                                onQueryProteinBindingSiteToggle(dataSourceName, chain, bindingSiteId, checked)} />
                    ))}

                {/* Panels for similar proteins */}
                {Object.entries(similarProteinsBindingSitesData).map(([dataSourceName, structureRecord]) =>
                    Object.entries(structureRecord).map(([pdbCode, chainRecord]) =>
                        Object.entries(chainRecord).map(([chain, bindingSiteRecord]) =>
                            <TogglerPanel key={`${dataSourceName}-${pdbCode}-${chain}`}
                                title={{ pdbCode: pdbCode, chain: chain, dataSourceName: dataSourceName }}
                                color={dataSourceColors[dataSourceName]}
                                dataSourceDisplayNames={dataSourceDisplayNames}
                                bindingSiteRecord={bindingSiteRecord}
                                isDisabled={isDisabled}
                                displayLoadingAnimationWhenDisabled={true}
                                onBindingSiteToggle={(bindingSiteId, checked) =>
                                    onSimilarProteinBindingSiteToggle(dataSourceName, pdbCode, chain, bindingSiteId, checked)} />
                        )
                    ))}
            </>)}
        </div>
    );
}

export default TogglerPanels;
