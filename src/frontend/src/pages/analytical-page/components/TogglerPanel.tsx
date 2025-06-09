import { useEffect, useRef, useState } from "react";
import { ScaleLoader } from "react-spinners";
import chroma from "chroma-js";
import { toBindingSiteLabel } from "../../../shared/helperFunctions/labels";
import { BindingSite } from "../AnalyticalPage";
import { motion, AnimatePresence } from "framer-motion";

type PanelTitle = {
    pdbCode?: string; // When pdb code isn't specified, query protein is assumed 
    chain: string;
    dataSourceName: string;
    tmScore?: number; // Optional, used for similar proteins
};

type Props = {
    title: PanelTitle;
    color: string;
    dataSourceDisplayNames: Record<string, string>;
    bindingSiteRecord: Record<string, boolean>; // bindingSiteRecord[bindingSiteId] -> true/false whether is binding site displayed
    bindingSites: Record<string, BindingSite>; // bindingSites[bindingSiteId] -> binding site
    isDisabled: boolean;
    displayLoadingAnimationWhenDisabled: boolean;
    onBindingSiteToggle: (bindingSiteId: string, checked: boolean) => void;
};

function TogglerPanel({
    title,
    color,
    dataSourceDisplayNames,
    bindingSiteRecord,
    bindingSites,
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
        <div className={`border rounded mb-2 ${isDisabled ? "bg-light text-dark" : ""}`}
            title={`${isDisabled ? "Bindings sites (or ligands) are loading..." : ""}`}
            style={{ backgroundColor: color }}>
            <div className="pt-2 d-flex flex-row"
                style={{
                    cursor: "pointer",
                    backgroundColor: chroma(color).alpha(0.175).css(),
                    boxShadow: !isPanelOpened ? "0 2px 8px rgba(0, 0, 0, 0.15)" : "0 2px 8px rgba(0, 0, 0, 0.25)",
                    padding: "2px 4px 0 4px"
                }}
                onClick={() => setIsPanelOpened(prevState => !prevState)}>
                <div className="d-flex w-100 mb-1 mr-auto pl-1 align-items-center">
                    <input type="checkbox"
                        className="mr-2"
                        checked={checkAll}
                        disabled={isDisabled}
                        onClick={e => e.stopPropagation()} // This onClick prevents toggling the panel when clicking the checkbox
                        onChange={e => setCheckAll(e.target.checked)}
                        title="Check/Uncheck all items in panel" />
                    <span>
                        <span><strong>{`${title.pdbCode?.toUpperCase() ?? "Query protein"}`}</strong></span>
                        <span> (chain <strong>{title.chain}</strong></span>
                        <span>, source: <em>{dataSourceDisplayNames[title.dataSourceName]}</em>)</span>
                        {title.tmScore && <span> | TM-score: <strong>{title.tmScore.toFixed(3)}</strong></span>}
                    </span>

                    <div className="d-flex align-items-center ml-auto">
                        {isDisabled && displayLoadingAnimationWhenDisabled &&
                            <ScaleLoader className="ml-2 my-auto" height={"10px"} color="#878787" />}
                        <span className="ml-2" style={{ fontSize: "1.5rem" }} >
                            {isPanelOpened ? "▴" : "▾"}
                        </span>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isPanelOpened && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        style={{ overflow: "hidden" }}>
                        <div className="mt-2 px-2">
                            {Object.entries(bindingSiteRecord).length === 0
                                ? <div className="pl-1">No binding sites.</div>
                                : <div className="pl-1" style={{ maxHeight: "23vh", overflow: "auto" }}>
                                    <table className="table table-sm">
                                        <thead className="thead-light" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                                            <tr>
                                                <th style={{ borderTop: "none" }}>Name</th>
                                                <th style={{ borderTop: "none" }}>Rank</th>
                                                <th style={{ borderTop: "none" }}>Score</th>
                                                <th style={{ borderTop: "none" }}>Probability</th>
                                                <th style={{ borderTop: "none" }}># of residues</th>
                                                <th style={{ borderTop: "none" }}>Avg conservation</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(bindingSiteRecord).map(([bindingSiteId, isDisplayed], i) =>
                                                bindingSiteId in bindingSites && (
                                                    <tr key={`${bindingSiteId}-${i}`}>
                                                        <td className="align-middle">
                                                            <label className="mb-0 d-flex align-items-center">
                                                                <input type="checkbox"
                                                                    name="checkbox"
                                                                    className="mr-2"
                                                                    checked={isDisplayed}
                                                                    disabled={isDisabled}
                                                                    onChange={() => handleChange(bindingSiteId, !isDisplayed)} />
                                                                {toBindingSiteLabel(bindingSiteId)}
                                                            </label>
                                                        </td>
                                                        <td>{bindingSites[bindingSiteId]?.rank ?? "-"}</td>
                                                        <td>{bindingSites[bindingSiteId]?.score?.toFixed(2) ?? "-"}</td>
                                                        <td>{bindingSites[bindingSiteId].confidence.toFixed(2)}</td>
                                                        <td>{bindingSites[bindingSiteId].residues.length}</td>
                                                        <td>{bindingSites[bindingSiteId]?.avgConservation?.toFixed(2) ?? "-"}</td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
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
