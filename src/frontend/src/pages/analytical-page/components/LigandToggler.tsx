import { useEffect, useState } from "react";
import { FadeLoader } from "react-spinners";

type Props = {
    // r[data source name][pdb code][chain][ligand id] -> true/false (show/hide ligands)
    data: Record<string, Record<string, Record<string, Record<string, boolean>>>>;
    onToggle: (dataSourceName: string, pdbCode: string, chain: string, ligandId: string, newValue: boolean) => void;
};

function LigandToggler({ data, onToggle }: Props) {
    // r[data source name][pdb code][chain] -> true/false (show/hide panel with ligands)
    const [isPanelDisplayed, setIsPanelDisplayed] = useState<Record<string, Record<string, Record<string, boolean>>> | null>(null);

    useEffect(() => {
        setIsPanelDisplayed(prev => {
            const mergedState: Record<string, Record<string, Record<string, boolean>>> = {};

            for (const [dataSourceName, structureRecord] of Object.entries(data)) {
                if (!mergedState[dataSourceName]) {
                    mergedState[dataSourceName] = {};
                }

                for (const [pdbCode, chainRecord] of Object.entries(structureRecord)) {
                    if (!mergedState[dataSourceName][pdbCode]) {
                        mergedState[dataSourceName][pdbCode] = {};
                    }

                    for (const chain of Object.keys(chainRecord)) {
                        const prevValue = prev?.[dataSourceName]?.[pdbCode]?.[chain];
                        mergedState[dataSourceName][pdbCode][chain] = prevValue ?? false;
                    }
                }
            }

            return mergedState;
        });
    }, [data]);


    if (!isPanelDisplayed) {
        return (
            <div className="d-flex py-2 justify-content-center align-items-center">
                <FadeLoader color="#c3c3c3" />
            </div>
        );
    }

    return (
        <div>
            {Object.entries(data).map(([dataSourceName, structureRecord]) =>
                Object.entries(structureRecord).map(([pdbCode, chainRecord]) =>
                    Object.entries(chainRecord).map(([chain, ligandRecord]) =>
                    (dataSourceName in isPanelDisplayed &&
                        pdbCode in isPanelDisplayed[dataSourceName] &&
                        chain in isPanelDisplayed[dataSourceName][pdbCode] && (
                            <div key={`${dataSourceName}-${pdbCode}-${chain}`} className="border rounded mb-2 pt-2 pb-1 px-2">
                                <div className="d-flex flex-row"
                                    style={{ cursor: "pointer" }}
                                    onClick={() =>
                                        setIsPanelDisplayed(prev => ({
                                            ...prev,
                                            [dataSourceName]: {
                                                ...prev[dataSourceName],
                                                [pdbCode]: {
                                                    ...prev[dataSourceName][pdbCode],
                                                    [chain]: !prev[dataSourceName][pdbCode][chain],
                                                },
                                            },
                                        }))
                                    }>
                                    <div className="w-100 border-bottom mb-1 mr-auto">
                                        {pdbCode.toUpperCase()} (chain {chain}, source: {dataSourceName})
                                    </div>
                                    <div className="mr-1 position-relative">
                                        <span className="position-absolute"
                                            style={{
                                                right: -1,
                                                bottom: 0,
                                                fontSize: "1.5rem"
                                            }} >
                                            {isPanelDisplayed[dataSourceName][pdbCode][chain] ? "▴" : "▾"}
                                        </span>
                                    </div>
                                </div>

                                {isPanelDisplayed[dataSourceName][pdbCode][chain] && (
                                    <div className="d-flex flex-row flex-wrap">
                                        {Object.entries(ligandRecord).map(([ligandId, isDisplayed], i) =>
                                            <div key={`${ligandId}-${i}`}>
                                                <label className="mr-2">
                                                    <input type="checkbox"
                                                        name="checkbox"
                                                        className="mr-1"
                                                        checked={isDisplayed}
                                                        onChange={() => onToggle(dataSourceName, pdbCode, chain, ligandId, !isDisplayed)} />
                                                    {ligandId}
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    ))
                ))}
        </div >
    );
}

export default LigandToggler;
