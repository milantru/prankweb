import LigandTogglerPanel from "./LigandTogglerPanel";

type Props = {
    // r[data source name][pdb code][chain][ligand id] -> true/false (show/hide ligands)
    similarProteinsData: Record<string, Record<string, Record<string, Record<string, boolean>>>>;
    onLigandToggle: (dataSourceName: string, pdbCode: string, chain: string, ligandId: string, newValue: boolean) => void;
};

function LigandToggler({ similarProteinsData, onLigandToggle }: Props) {
    return (
        <div>
            {Object.entries(similarProteinsData).map(([dataSourceName, structureRecord]) =>
                Object.entries(structureRecord).map(([pdbCode, chainRecord]) =>
                    Object.entries(chainRecord).map(([chain, ligandsRecord]) =>
                        <LigandTogglerPanel key={`${dataSourceName}-${pdbCode}-${chain}`}
                            title={`${pdbCode.toUpperCase()} (chain ${chain}, source: ${dataSourceName})`}
                            ligandsRecord={ligandsRecord}
                            onLigandToggle={(ligandId, checked) => onLigandToggle(dataSourceName, pdbCode, chain, ligandId, checked)} />
                    )
                ))}
        </div>
    );
}

export default LigandToggler;
