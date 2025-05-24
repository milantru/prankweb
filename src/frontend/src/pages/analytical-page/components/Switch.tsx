import { useState } from "react";
import "./Switch.tsx.css"

type Props = {
    classes?: string;
    isOnInitially?: boolean;
    onToggle: (state: boolean) => void;
};

function Switch({ classes = "", isOnInitially = false, onToggle }: Props) {
    const [checked, setChecked] = useState(isOnInitially);

    const handleChange = () => {
        const newState = !checked;
        setChecked(newState);
        onToggle(newState);
    };

    return (
        <div className={`custom-switch-wrapper ${classes}`}>
            <label className="custom-switch">
                <input
                    type="checkbox"
                    className="custom-switch-input"
                    checked={checked}
                    onChange={handleChange} />
                <span className="custom-switch-slider" />
            </label>
        </div>
    );
}

export default Switch;
