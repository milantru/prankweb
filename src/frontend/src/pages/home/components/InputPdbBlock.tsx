export type InputPdbBlockData = {
    pdbCode: string;
    useOriginalStructure: boolean;
    useConservation: boolean;
};

type Props = {
    data: InputPdbBlockData;
    setData: (data: InputPdbBlockData) => void;
};

function InputPdbBlock({ data, setData }: Props) {
    return (
        <div id="input-pdb-block">
            <div className="mb-3">
                <label htmlFor="pdb-code" className="form-label">PDB Code</label>
                <input type="text" className="form-control" id="pdb-code" name="pdbCode" placeholder="2SRC"
                    title="PrankWeb will use the protein file from PDB."
                    value={data.pdbCode}
                    onChange={e => setData({ ...data, pdbCode: e.target.value })} />
            </div>
            <div className="form-check">
                <input className="form-check-input" type="checkbox" id="pdb-seal-structure"
                    title="Uncheck to allow chain filtering."
                    checked={data.useOriginalStructure}
                    onChange={e => setData({ ...data, useOriginalStructure: e.target.checked })} />
                <label className="form-check-label" htmlFor="pdb-seal-structure">
                    Use original structure
                </label>
            </div>
            {!data.useOriginalStructure && (
                <div id="pdb-chains">
                    {/* TODO Q What is this? */}
                    <input id="pdb-chains-store" style={{ display: "none" }} />
                    <div id="pdb-chains-label">
                        Loading chains from PDB ...
                    </div>
                    <div className="form-check-inline" id="pdb-chains-container">
                        {/* Chain check boxes are here. */}
                    </div>
                </div>
            )}
            <div className="form-check">
                <input className="form-check-input" type="checkbox" id="conservation-pdb"
                    title="If checked, a model that exploits conservation will be used to classify protein binding sites."
                    checked={data.useConservation}
                    onChange={e => setData({ ...data, useConservation: e.target.checked })} />
                <label className="form-check-label" htmlFor="conservation-pdb">
                    Use <a href="./help#conservation" target="_blank">conservation</a>
                </label>
            </div>
        </div>
    );
}

export default InputPdbBlock;
