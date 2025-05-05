import { useState } from "react";

type Props = {
    title: string;
    ligandsRecord: Record<string, boolean>;
    onLigandToggle: (ligandId: string, checked: boolean) => void;
};

function LigandTogglerPanel({ title, ligandsRecord, onLigandToggle }: Props) {
    const [isPanelOpened, setIsPanelOpened] = useState<boolean>(false);

    return (
        <div className="border rounded mb-2 pt-2 pb-1 px-2">
            <div className="d-flex flex-row mb-1"
                style={{ cursor: "pointer" }}
                onClick={() => setIsPanelOpened(prevState => !prevState)}>
                <div className="w-100 border-bottom mb-1 mr-auto">{title}</div>
                <div className="mr-1 position-relative">
                    <span className="position-absolute"
                        style={{
                            right: -1,
                            bottom: 0,
                            fontSize: "1.5rem"
                        }} >
                        {isPanelOpened ? "▴" : "▾"}
                    </span>
                </div>
            </div>

            {isPanelOpened && (
                <div className="d-flex flex-row flex-wrap pl-1">
                    {Object.entries(ligandsRecord).length === 0
                        ? <div>No ligands.</div>
                        : <>
                            {Object.entries(ligandsRecord).map(([ligandId, isDisplayed], i) =>
                                <div key={`${ligandId}-${i}`}>
                                    <label className="mr-2">
                                        <input type="checkbox"
                                            name="checkbox"
                                            className="mr-1"
                                            checked={isDisplayed}
                                            onChange={() => onLigandToggle(ligandId, !isDisplayed)} />
                                        {ligandId}
                                    </label>
                                </div>
                            )}
                        </>}
                </div>
            )}
        </div>
    );
}

export default LigandTogglerPanel;
