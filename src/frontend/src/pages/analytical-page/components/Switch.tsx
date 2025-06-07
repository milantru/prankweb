import { useState } from "react";
import "./checkbox.css";

type Props = {
    classes?: string;
    isDisabled: boolean;
    isOnInitially?: boolean;
    onToggle: (state: boolean) => void;
};

function Switch({ classes = "", isDisabled, isOnInitially = false, onToggle }: Props) {
    const [checked, setChecked] = useState(isOnInitially);

    const handleChange = () => {
        const newState = !checked;
        setChecked(newState);
        onToggle(newState);
    };

    return (
        <div className={`plankweb-checkbox-wrapper ${classes}`}>
            <label className="plankweb-checkbox">
                <span className="plankweb-checkbox-label">Support-Based Highlighting</span>
                <input
                    type="checkbox"
                    className="plankweb-checkbox-input"
                    checked={checked}
                    disabled={isDisabled}
                    onChange={handleChange}
                />
                <span className="plankweb-checkbox-box">
                    <svg className="checkmark" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </span>
            </label>
        </div>


    );
}

export default Switch;
