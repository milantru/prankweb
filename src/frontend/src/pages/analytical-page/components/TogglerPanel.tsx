import { useEffect, useState } from "react";
import { ScaleLoader } from "react-spinners";

type Props = {
    title: string;
    bindingSiteRecord: Record<string, boolean>;
    isDisabled: boolean;
    displayLoadingAnimationWhenDisabled: boolean;
    onBindingSiteToggle: (bindingSiteId: string, checked: boolean) => void;
};

function TogglerPanel({
    title,
    bindingSiteRecord,
    isDisabled,
    displayLoadingAnimationWhenDisabled,
    onBindingSiteToggle
}: Props) {
    const [isPanelOpened, setIsPanelOpened] = useState<boolean>(true);

    useEffect(() => {
        /* This useEffect ensures the following behaviour:
         * When panel is disabled and loading animation is displayed (e.g. when user loads the page for the first time,
         * or switches the chain) the panel is closed. When all is set and animation is stopped (panel is no more disabled),
         * the panel opens. */
        setIsPanelOpened(!(isDisabled && displayLoadingAnimationWhenDisabled));
    }, [isDisabled, displayLoadingAnimationWhenDisabled]);

    return (
        <div className={`border rounded mb-2 pt-2 pb-1 px-2 ${isDisabled ? "bg-light text-dark" : ""}`}
            title={`${isDisabled ? "Bindings sites (or ligands) are loading..." : ""}`}>
            <div className="d-flex flex-row mb-1"
                style={{ cursor: "pointer" }}
                onClick={() => setIsPanelOpened(prevState => !prevState)}>
                <div className="d-flex w-100 border-bottom mb-1 mr-auto pl-1 align-items-center">
                    {title}

                    <div className="d-flex align-items-center ml-auto">
                        {isDisabled && displayLoadingAnimationWhenDisabled &&
                            <ScaleLoader className="ml-2 my-auto" height={"10px"} color="#878787" />}
                        <span className="ml-2" style={{ fontSize: "1.5rem" }} >
                            {isPanelOpened ? "▴" : "▾"}
                        </span>
                    </div>
                </div>
            </div>

            {isPanelOpened && (<>
                {Object.entries(bindingSiteRecord).length === 0
                    ? <div className="pl-1">No binding sites.</div>
                    : <div className="d-flex flex-row flex-wrap pl-1" style={{ maxHeight: "23vh", overflow: "auto" }}>
                        {Object.entries(bindingSiteRecord).map(([bindingSiteId, isDisplayed], i) =>
                            <div key={`${bindingSiteId}-${i}`}>
                                <label className="mr-2">
                                    <input type="checkbox"
                                        name="checkbox"
                                        className="mr-1"
                                        checked={isDisplayed}
                                        disabled={isDisabled}
                                        onChange={() => onBindingSiteToggle(bindingSiteId, !isDisplayed)} />
                                    {bindingSiteId}
                                </label>
                            </div>
                        )}
                    </div>}
            </>)}
        </div>
    );
}

export default TogglerPanel;
