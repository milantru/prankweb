import { useState } from "react";
import "./Switch.tsx.css"

type Props = {
    isOnInitially?: boolean;
    classes?: string;
    onToggle: (state: boolean) => void;
};

function Switch({ isOnInitially = false, classes = "", onToggle }: Props) {
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
