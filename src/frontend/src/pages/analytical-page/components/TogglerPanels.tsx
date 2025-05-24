import TogglerPanel from "./TogglerPanel";

type Props = {
    classes?: string;
    // queryProteinBindingSitesData[dataSourceName][chain][bindingSiteId] -> true/false to show bindings site (and also ligands if available)
    queryProteinBindingSitesData: Record<string, Record<string, Record<string, boolean>>>;
    // similarProteinsBindingSitesData[dataSourceName][pdbCode][chain][bindingSiteId] -> true/false to show bindings site (and also ligands if available)
    similarProteinsBindingSitesData: Record<string, Record<string, Record<string, Record<string, boolean>>>>;
    isDisabled: boolean;
    onQueryProteinBindingSiteToggle: (dataSourceName: string, chain: string, bindingSiteId: string, newValue: boolean) => void;
    onSimilarProteinBindingSiteToggle: (dataSourceName: string, pdbCode: string, chain: string, bindingSiteId: string, newValue: boolean) => void;
};

function TogglerPanels({
    classes = "",
    queryProteinBindingSitesData,
    similarProteinsBindingSitesData,
    isDisabled,
    onQueryProteinBindingSiteToggle,
    onSimilarProteinBindingSiteToggle
}: Props) {
    return (
        <div className={classes}>
            {/* Panels for query protein */}
            {Object.entries(queryProteinBindingSitesData).map(([dataSourceName, chainRecord]) =>
                Object.entries(chainRecord).map(([chain, bindingSiteRecord]) =>
                    <TogglerPanel key={`${dataSourceName}-${chain}`}
                        title={`Query protein (chain ${chain}, source: ${dataSourceName})`}
                        bindingSiteRecord={bindingSiteRecord}
                        isDisabled={isDisabled}
                        displayLoadingAnimationWhenDisabled={true}
                        onBindingSiteToggle={(bindingSiteId, checked) => onQueryProteinBindingSiteToggle(dataSourceName, chain, bindingSiteId, checked)} />
                ))}

            {/* Panels for similar proteins */}
            {Object.entries(similarProteinsBindingSitesData).map(([dataSourceName, structureRecord]) =>
                Object.entries(structureRecord).map(([pdbCode, chainRecord]) =>
                    Object.entries(chainRecord).map(([chain, bindingSiteRecord]) =>
                        <TogglerPanel key={`${dataSourceName}-${pdbCode}-${chain}`}
                            title={`${pdbCode.toUpperCase()} (chain ${chain}, source: ${dataSourceName})`}
                            bindingSiteRecord={bindingSiteRecord}
                            isDisabled={isDisabled}
                            displayLoadingAnimationWhenDisabled={true}
                            onBindingSiteToggle={(bindingSiteId, checked) => onSimilarProteinBindingSiteToggle(dataSourceName, pdbCode, chain, bindingSiteId, checked)} />
                    )
                ))}
        </div>
    );
}

export default TogglerPanels;
