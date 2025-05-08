import LigandTogglerPanel from "./LigandTogglerPanel";

type Props = {
    // r[data source name][chain][ligand id] -> true/false (show/hide ligands)
    queryProteinLigandsData: Record<string, Record<string, Record<string, boolean>>>;
    // r[data source name][pdb code][chain][ligand id] -> true/false (show/hide ligands)
    similarProteinsLigandsData: Record<string, Record<string, Record<string, Record<string, boolean>>>>;
    onQueryProteinLigandToggle: (dataSourceName: string, chain: string, ligandId: string, newValue: boolean) => void;
    onSimilarProteinLigandToggle: (dataSourceName: string, pdbCode: string, chain: string, ligandId: string, newValue: boolean) => void;
};

function LigandToggler({ queryProteinLigandsData, similarProteinsLigandsData, onQueryProteinLigandToggle, onSimilarProteinLigandToggle }: Props) {
    return (
        <div>
            {/* Panels for query protein */}
            {Object.entries(queryProteinLigandsData).map(([dataSourceName, chainRecord]) =>
                Object.entries(chainRecord).map(([chain, ligandsRecord]) =>
                    <LigandTogglerPanel key={`${dataSourceName}-${chain}`}
                        title={`Query protein (chain ${chain}, source: ${dataSourceName})`}
                        ligandsRecord={ligandsRecord}
                        onLigandToggle={(ligandId, checked) => onQueryProteinLigandToggle(dataSourceName, chain, ligandId, checked)} />
                ))}

            {/* Panels for similar proteins */}
            {Object.entries(similarProteinsLigandsData).map(([dataSourceName, structureRecord]) =>
                Object.entries(structureRecord).map(([pdbCode, chainRecord]) =>
                    Object.entries(chainRecord).map(([chain, ligandsRecord]) =>
                        <LigandTogglerPanel key={`${dataSourceName}-${pdbCode}-${chain}`}
                            title={`${pdbCode.toUpperCase()} (chain ${chain}, source: ${dataSourceName})`}
                            ligandsRecord={ligandsRecord}
                            onLigandToggle={(ligandId, checked) => onSimilarProteinLigandToggle(dataSourceName, pdbCode, chain, ligandId, checked)} />
                    )
                ))}
        </div>
    );
}

export default LigandToggler;
