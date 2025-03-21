import { useEffect, useState } from "react";
import { sanitizeSequence } from "../../../shared/helperFunctions/validation";

export type InputSequenceBlockData = {
    sequence: string;
    useConservation: boolean;
};

type Props = {
    data: InputSequenceBlockData;
    setData: (data: InputSequenceBlockData) => void;
    setErrorMessage: (errorMessage: string) => void;
    maxSequenceLength: number;
};

function InputSequenceBlock({ data, setData, setErrorMessage, maxSequenceLength }: Props) {
    const placeholderSequence = "XMTEYKLVVVGAGGVGKSALTIQLIQNHFVDEYDPTIEDSYRKQVVIDGETCLLDILDTAGQ" +
        "EEYSAMRDQYMRTGEGFLCVFAINNTKSFEDIHQYREQIKRVKDSDDVPMVLVGNKCDLAA" +
        "RTVESRQAQDLARSYGIPYIETSAKTRQGVEDAFYTLVREIRQHKLRKLNPPDESGPGCMSCKCVLSABC";
    const [isSequenceInputFocused, setIsSequenceInputFocused] = useState<boolean>(false);

    useEffect(() => {
        const editor = document.getElementById("editor");

        if (isSequenceInputFocused) {
            editor.innerText = data.sequence;
            updateHighlight();
        } else {
            if (editor.innerText.length === 0) {
                editor.innerText = placeholderSequence;
            }
        }
    }, [isSequenceInputFocused]);

    useEffect(() => {
        const editor = document.getElementById("editor");

        if (data.sequence.length > 0) {
            editor.innerText = data.sequence;
            updateHighlight();
        } else {
            editor.innerText = placeholderSequence;
        }
    }, []);

    return (
        <div id="input-sequence-block">
            <div className="mb-3">
                <label htmlFor="editor" className="form-label">Sequence</label>
                <div contentEditable
                    id="editor"
                    className="form-control"
                    style={{
                        minHeight: "82px",
                        // If data.sequence.length > 0, then placeholder is displayed and we want to decrease opacity
                        color: data.sequence.length > 0 ? "#495057" : "#49505780"
                    }}
                    // TODO title is true, or...?
                    title="PlankWeb will use AlphaFold predicted structure."
                    onInput={updateHighlight}
                    onFocus={() => setIsSequenceInputFocused(true)}
                    onBlur={() => setIsSequenceInputFocused(false)}>
                </div>
            </div>
            <div className="form-check">
                <input className="form-check-input" type="checkbox" id="conservation-uniprot"
                    title="If checked, a model that exploits conservation will be used to classify protein binding sites."
                    checked={data.useConservation}
                    onChange={e => setData({ ...data, useConservation: e.target.checked })} />
                <label className="form-check-label" htmlFor="conservation-uniprot">
                    Use <a href="./help#conservation" target="_blank">conservation</a>
                </label>
            </div>
        </div>
    );

    function getCursorPosition() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) {
            return 0;
        }

        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(document.getElementById("editor"));
        preCaretRange.setEnd(range.startContainer, range.startOffset);

        return preCaretRange.toString().length;
    }

    function setCursorPosition(position) {
        const editor = document.getElementById("editor");
        const selection = window.getSelection();
        const range = document.createRange();

        let charCount = 0;
        function findNode(node) {
            if (node.nodeType === 3) { // Text node
                if (charCount + node.length >= position) {
                    range.setStart(node, position - charCount);
                    range.collapse(true);

                    return true;
                }
                charCount += node.length;
            } else {
                for (let i = 0; i < node.childNodes.length; i++) {
                    if (findNode(node.childNodes[i])) {
                        return true;
                    }
                }
            }

            return false;
        }

        findNode(editor);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function createMapping(longerSeq: string, shorterSeq: string) {
        longerSeq = longerSeq.toLowerCase();
        shorterSeq = shorterSeq.toLowerCase();
        const mapping: Record<number, number> = {};

        for (let i = 0, j = 0; i < longerSeq.length; i++, j++) {
            mapping[i] = j;

            if (longerSeq[i] !== shorterSeq[j]) {
                /* i-th character of the longer sequence was deleted so it is mapped to j-th character of the shorter sequence.
                 * We stay at the j-th character in shorther sequence until we find it in the longer sequence,
                 * or we run out of longer sequence characters (which just means longer sequence ended with non-letter
                 * characters and we are mapping them to the last character of the shorter sequence, which is OK). */
                j--;
            }
        }

        return mapping;
    }

    function updateHighlight() {
        const editor = document.getElementById("editor");

        // Sanitize sequence (it may delete some characters so cursor position has to be updated)
        const originalText = editor.innerText;
        const sanitizedText = sanitizeSequence(originalText);
        const mapping = createMapping(originalText, sanitizedText);
        const cursorPos = mapping[getCursorPosition()];

        setData({ ...data, sequence: sanitizedText })

        const sequencePartWithinLengthLimit = sanitizedText.substring(0, maxSequenceLength);
        let formattedText = `<span>${sequencePartWithinLengthLimit}</span>`;
        if (sanitizedText.length > maxSequenceLength) {
            // Apply styling: red for characters beyond max_sequence_length
            const sequencePartBeyondLengthLimit = sanitizedText.substring(maxSequenceLength);
            formattedText += `<span style="color: red;">${sequencePartBeyondLengthLimit}</span>`;
        }
        editor.innerHTML = formattedText;

        if (sanitizedText.length > 0) {
            // Restore cursor position, but only when sanitizedText.length > 0, otherwise the page "jumps"
            const newCursorPos = cursorPos === undefined || cursorPos >= sanitizedText.length
                ? sanitizedText.length
                : cursorPos;
            setCursorPosition(newCursorPos);
        }
    }
}

export default InputSequenceBlock;
