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
        function initIsPanelDisplayedState() {
            const isPanelDisplayedTmp: Record<string, Record<string, Record<string, boolean>>> = {};

            for (const [dataSourceName, structureRecord] of Object.entries(data)) {
                for (const [pdbCode, chainRecord] of Object.entries(structureRecord)) {
                    for (const chain of Object.keys(chainRecord)) {
                        if (!(dataSourceName in isPanelDisplayedTmp)) {
                            isPanelDisplayedTmp[dataSourceName] = {};
                        }
                        if (!(pdbCode in isPanelDisplayedTmp[dataSourceName])) {
                            isPanelDisplayedTmp[dataSourceName][pdbCode] = {};
                        }
                        isPanelDisplayedTmp[dataSourceName][pdbCode][chain] = false;
                    }
                }
            }

            setIsPanelDisplayed(isPanelDisplayedTmp);
        }

        initIsPanelDisplayedState();
    }, []);

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
                                <div className="d-flex flex-row">
                                    <div className="border-bottom mb-1">{pdbCode.toUpperCase()} ({dataSourceName})</div>
                                    <div className="ml-auto mr-1">
                                        <button onClick={() =>
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
                                            {isPanelDisplayed[dataSourceName][pdbCode][chain] ? '▴' : '▾'}
                                        </button>
                                    </div>
                                </div>

                                {isPanelDisplayed[dataSourceName][pdbCode][chain] && (
                                    <div className="d-flex flex-row flex-wrap">
                                        {Object.entries(ligandRecord).map(([ligandId, isDisplayed]) =>
                                            <div key={ligandId}>
                                                <label className="mr-2">
                                                    <input type="checkbox"
                                                        name="checkbox"
                                                        className="mr-1"
                                                        checked={isDisplayed}
                                                        onClick={() => onToggle(dataSourceName, pdbCode, chain, ligandId, !isDisplayed)} />
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
