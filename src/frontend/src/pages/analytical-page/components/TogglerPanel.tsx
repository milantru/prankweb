import { useEffect, useRef, useState } from "react";
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
    const [checkAll, setCheckAll] = useState<boolean>(false);
    const justUncheckCheckbox = useRef<boolean>(false);

    useEffect(() => {
        /* This useEffect ensures the following behaviour:
         * When panel is disabled and loading animation is displayed (e.g. when user loads the page for the first time,
         * or switches the chain) the panel is closed. When all is set and animation is stopped (panel is no more disabled),
         * the panel opens. */
        setIsPanelOpened(!(isDisabled && displayLoadingAnimationWhenDisabled));
    }, [isDisabled, displayLoadingAnimationWhenDisabled]);

    useEffect(() => {
        if (isDisabled) {
            // When it's disabled, not user, nor we are permitted to toggle items (they might be still loading)
            return;
        }


        if (checkAll) {
            const notCheckedItems = Object.entries(bindingSiteRecord).filter(([_, isDisplayed]) => !isDisplayed);

            for (const [bindingSiteId, _] of notCheckedItems) {
                onBindingSiteToggle(bindingSiteId, true);
            }
        } else {
            if (justUncheckCheckbox.current) {
                // Checkbox unchecked, do nothing more (only reset variable)
                justUncheckCheckbox.current = false;
                return;
            }
            /* User unchecked checkAll checkbox, so if ALL items are checked, we want to uncheck them.
             * (If only SOME would be be checked, we wouldn't want uncheck all.) */
            const areAllChecked = Object.entries(bindingSiteRecord).every(([_, isDisplayed]) => isDisplayed);
            if (areAllChecked) {
                for (const [bindingSiteId, _] of Object.entries(bindingSiteRecord)) {
                    onBindingSiteToggle(bindingSiteId, false);
                }
            }
        }
    }, [checkAll, justUncheckCheckbox, isDisabled]);

    return (
        <div className={`border rounded mb-2 pt-2 pb-1 px-2 ${isDisabled ? "bg-light text-dark" : ""}`}
            title={`${isDisabled ? "Bindings sites (or ligands) are loading..." : ""}`}>
            <div className="d-flex flex-row mb-1"
                style={{ cursor: "pointer" }}
                onClick={() => setIsPanelOpened(prevState => !prevState)}>
                <div className="d-flex w-100 border-bottom mb-1 mr-auto pl-1 align-items-center">
                    <input type="checkbox"
                        className="mr-2"
                        checked={checkAll}
                        disabled={isDisabled}
                        onClick={e => e.stopPropagation()} // This onClick prevents toggling the panel when clicking the checkbox
                        onChange={e => setCheckAll(e.target.checked)}
                        title="Check/Uncheck all items in panel" />
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
                                        onChange={() => handleChange(bindingSiteId, !isDisplayed)} />
                                    {bindingSiteId}
                                </label>
                            </div>
                        )}
                    </div>}
            </>)}
        </div>
    );

    function handleChange(bindingSiteId: string, show: boolean): void {
        const totalCount = Object.entries(bindingSiteRecord).length;
        const checkedCount = Object.entries(bindingSiteRecord).filter(([_, isDisplayed]) => isDisplayed).length;

        if (show && !checkAll && (totalCount - checkedCount === 1)) {
            /* User checks item and checkAll checkbox is not checked, what if user checked last unchecked item? 
             * So by checking it, all items are checked. So we update state (checkAll checkbox). */
            const hidden = Object.entries(bindingSiteRecord).filter(([_, isDisplayed]) => !isDisplayed);
            if (hidden.length > 0) {
                const lastHidden = hidden[0];
                if (bindingSiteId === lastHidden[0]) { // This if is here due to defensive programming, but should not be needed
                    setCheckAll(true);
                }
            }
        }

        if (!show && checkAll) {
            /* If user unchecked some item and checkAll was checked, update state (checkAll checkbox).
             * The thing is, that we want to unchech all items ONLY if ALL are checked.
             * But I don't see any guarantee that onBindingSiteToggle won't uncheck item (set isDisplayed to false) faster
             * than useEffect will check all items... It would cause problem in useEffect. That is why justUncheckCheckbox exists. */
            justUncheckCheckbox.current = true;
            setCheckAll(false);
        }

        onBindingSiteToggle(bindingSiteId, show);
    }
}

export default TogglerPanel;
