export type InputSequenceBlockData = {
    sequence: string;
    useConservation: boolean;
};

type Props = {
    data: InputSequenceBlockData;
    setData: (data: InputSequenceBlockData) => void;
    setErrorMessage: (errorMessage: string) => void;
};

function InputSequenceBlock({ data, setData, setErrorMessage }: Props) {
    const placeholderSequence = "XMTEYKLVVVGAGGVGKSALTIQLIQNHFVDEYDPTIEDSYRKQVVIDGETCLLDILDTAGQ" +
        "EEYSAMRDQYMRTGEGFLCVFAINNTKSFEDIHQYREQIKRVKDSDDVPMVLVGNKCDLAA" +
        "RTVESRQAQDLARSYGIPYIETSAKTRQGVEDAFYTLVREIRQHKLRKLNPPDESGPGCMSCKCVLSABC";

    return (
        <div id="input-sequence-block">
            <div className="mb-3">
                <label htmlFor="sequence" className="form-label">Sequence</label>
                <textarea className="form-control" id="sequence" name="sequence" rows={3}
                    value={data.sequence}
                    onChange={e => setData({ ...data, sequence: e.target.value })}
                    // TODO title is true, or...?
                    placeholder={placeholderSequence} title="PlankWeb will use AlphaFold predicted structure.">
                </textarea>
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
}

export default InputSequenceBlock;
