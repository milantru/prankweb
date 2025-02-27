function QueryProteinForm() {
    return (
        <form name="input-form">
            <div className="card" style={{marginTop: "2rem", marginBottom: "1rem"}}>
                <div className="card-header">
                    Please select input method
                </div>
                <div className="card-body">
                    <div>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" id="input-pdb" value="input-pdb"
                                name="input-type" />
                            <label className="form-check-label" htmlFor="input-pdb">
                                Experimental structure
                            </label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" id="input-user-file" value="input-user-file"
                                name="input-type" />
                            <label className="form-check-label" htmlFor="input-user-file">
                                Custom structure
                            </label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" id="input-uniprot" value="input-uniprot"
                                name="input-type" />
                            <label className="form-check-label" htmlFor="input-uniprot">
                                AlphaFold structure
                            </label>
                        </div>
                    </div>
                    <hr />
                    <div id="input-pdb-block">
                        <div className="mb-3">
                            <label htmlFor="pdb-code" className="form-label">PDB Code</label>
                            <input type="text" className="form-control" id="pdb-code" name="pdbCode" placeholder="2SRC"
                                title="PrankWeb will use the protein file from PDB." />
                        </div>
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" value="" id="pdb-seal-structure"
                                title="Uncheck to allow chain filtering." checked />
                            <label className="form-check-label" htmlFor="pdb-seal-structure">
                                Use original structure
                            </label>
                        </div>
                        <div id="pdb-chains" style={{ display: "none" }}>
                            <input id="pdb-chains-store" style={{ display: "none" }} />
                            <div id="pdb-chains-label">
                                Loading chains from PDB ...
                            </div>
                            <div className="form-check-inline" id="pdb-chains-container">
                                {/* Chain check boxes are here. */}
                            </div>
                        </div>
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="conservation-pdb"
                                title="If checked, a model that exploits conservation will be used to classify protein binding sites."
                                checked={true} />
                            <label className="form-check-label" htmlFor="conservation-pdb">
                                Use
                                <a href="./help#conservation" target="_blank">conservation</a>
                            </label>
                        </div>
                    </div>
                    <div id="input-user-file-block" style={{ display: "none" }}>
                        <div className="mb-3">
                            <label htmlFor="user-file" className="form-label">
                                Structure file (PDB/mmCIF) with biologically relevant unit
                            </label>
                            <input className="form-control" type="file" id="user-file" />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="user-file-chains" className="form-label">Restrict to chains</label>
                            <input type="text" className="form-control" id="user-file-chains" name="userFileChains"
                                placeholder="A,B" title="Optional. Comma separated list of chains to analyze." />
                        </div>
                        <div>
                            <input type="radio" name="user-input-model" id="user-input-model-1" value="default"
                                title="If selected, a default prediction model will be used." />
                            <label htmlFor="user-input-model-1" className="form-label">Default prediction model</label><br />

                            <input type="radio" name="user-input-model" id="user-input-model-2" value="conservation_hmm"
                                checked={true}
                                title="If selected, a default prediction model with conservation will be used." />
                            <label htmlFor="user-input-model-2" className="form-label">Default model with
                                <a href="./help#conservation" target="_blank">conservation</a></label><br />

                            <input type="radio" name="user-input-model" id="user-input-model-3" value="alphafold"
                                title="If selected, an AlphaFold prediction model will be used." />
                            <label htmlFor="user-input-model-3" className="form-label">AlphaFold model</label><br />

                            <input type="radio" name="user-input-model" id="user-input-model-4"
                                value="alphafold_conservation_hmm"
                                title="If selected, an AlphaFold prediction model with conservation will be used." />
                            <label htmlFor="user-input-model-4" className="form-label">AlphaFold model with
                                <a href="./help#conservation" target="_blank">conservation</a></label><br />
                        </div>
                    </div>
                    <div id="input-uniprot-block" style={{ display: "none" }}>
                        <div className="mb-3">
                            <label htmlFor="uniprot-code" className="form-label">UniProt ID</label>
                            <input type="text" className="form-control" id="uniprot-code" name="uniprotCode"
                                placeholder="Q5VSL9" title="PrankWeb will use AlphaFold predicted structure." />
                        </div>
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="conservation-uniprot"
                                title="If checked, a model that exploits conservation will be used to classify protein binding sites."
                                checked={true} />
                            <label className="form-check-label" htmlFor="conservation-uniprot">
                                Use
                                <a href="./help#conservation" target="_blank">conservation</a>
                            </label>
                        </div>
                    </div>
                </div>
                <div className="card-footer" id="message" style={{ display: "none" }}>
                    {/* Messages are here. */}
                </div>
            </div>
            <div>
                <button type="submit" className="btn btn-primary float-md-end" id="submit-button">
                    Submit
                </button>
            </div>
        </form>
    )
}

export default QueryProteinForm;
