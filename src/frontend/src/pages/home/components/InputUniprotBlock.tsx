export type InputUniprotBlockData = {
    uniprotCode: string;
    useConservation: boolean;
};

type Props = {
    data: InputUniprotBlockData;
    setData: (data: InputUniprotBlockData) => void;
};

function InputUniprotBlock({ data, setData }: Props) {
    return (
        <div id="input-uniprot-block">
            <div className="mb-3">
                <label htmlFor="uniprot-code" className="form-label">UniProt ID</label>
                <input type="text" className="form-control" id="uniprot-code" name="uniprotCode"
                    placeholder="Q5VSL9" title="PrankWeb will use AlphaFold predicted structure."
                    value={data.uniprotCode}
                    onChange={e => setData({...data, uniprotCode: e.target.value})} />
            </div>
            <div className="form-check">
                <input className="form-check-input" type="checkbox" id="conservation-uniprot"
                    title="If checked, a model that exploits conservation will be used to classify protein binding sites."
                    checked={data.useConservation}
                    onChange={e => setData({...data, useConservation: e.target.checked})} />
                <label className="form-check-label" htmlFor="conservation-uniprot">
                    Use <a href="./help#conservation" target="_blank">conservation</a>
                </label>
            </div>
        </div>
    );
}

export default InputUniprotBlock;
