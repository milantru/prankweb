import { useState } from "react";
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
    const [isPanelOpened, setIsPanelOpened] = useState<boolean>(false);

    return (
        <div className={`border rounded mb-2 pt-2 pb-1 px-2 ${isDisabled ? "bg-light text-dark" : ""}`}
            title={`${isDisabled ? "Bindings sites (or ligands) are loading..." : ""}`}>
            <div className="d-flex flex-row mb-1"
                style={{ cursor: "pointer" }}
                onClick={() => setIsPanelOpened(prevState => !prevState)}>
                <div className="d-flex w-100 border-bottom mb-1 mr-auto">
                    {title}
                    {isDisabled && displayLoadingAnimationWhenDisabled &&
                        <ScaleLoader className="ml-2 my-auto" height={"10 %"} color="#878787" />}
                </div>
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
                    {Object.entries(bindingSiteRecord).length === 0
                        ? <div>No binding sites.</div>
                        : <>
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
                        </>}
                </div>
            )}
        </div>
    );
}

export default TogglerPanel;
