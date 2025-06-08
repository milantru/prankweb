function Help() {
    return (
        <div className="container">
            <section id="user-guide">
                <h1>User guide</h1>
                <p>
                    PlankWeb is a web-based application that allows to predict and visualize protein-ligand binding sites.
                    Furthermore, it allows to compare the location of predicted pockets with highly conserved areas as well as actual
                    ligand binding sites.
                    All one needs to use PlankWeb is a device with a web-browser that supports WebGL.
                </p>
            </section>

            <h2 id="quick-start">Quick start</h2>

            <section id="structure-selection">
                <h3>Structure selection</h3>
                <p>
                    The user can specify what protein to analyze in four ways:
                    <ul>
                        <li>PDB code <em>(Experimental structure)</em></li>
                        <li>Upload a structure .pdb file <em>(Custom structure)</em></li>
                        <li>Uniprot ID <em>(AlphaFold structure)</em></li>
                        <li>Text sequence <em>(Sequence)</em></li>
                    </ul>
                </p>
                <p>
                    The user may also specify whether to <strong>use evolutionary conservation</strong> in the prediction model. This
                    makes the analysis more accurate. The conservation score calculated represents protein similarity to
                    other proteins in the same family. More information available <a href="#conservation">below</a>.
                </p>
            </section>

            <section id="analytical-page">
                <h3>Analytical page</h3>
                <p>
                    Once the protein is submitted, user is redirected to the analytical page where when the calculations are finished
                    the <a href="#settings-panel"><em>settings panel</em></a> and two visualizations
                    appear: <a href="#sequence-visualization"><em>sequence visualization</em></a> and <a href="#structural-visualization"><em>structural visualization</em></a>.
                </p>
            </section>

            <section id="settings-panel">
                <h4>Settings panel</h4>
                <p>
                    This panel can be used to <strong>switch between different chains</strong> of the submitted protein.
                    Changing the chain will also update the contents of the sequence visualization. Apart from that,
                    in the structural visualization the structures are superpositioned according to the selected chain.
                </p>
                <p>
                    Using the panel, user can also choose to <strong>"squash"</strong> the binding sites to save space
                    in sequence visualization.
                </p>
                <p>
                    User can also choose to <strong>start query sequence at 0</strong> in the sequence visualization.
                    This will move query protein sequence to start at position 0 and all the visualized similar proteins
                    along with it. Because of some issues we encountered during the development, we are not sure whether
                    the sequence visualization is built to visualize sequences from 0 (or in case of similar proteins even
                    from negative positions), thus we labeled this feature as <strong>Experimental</strong>.
                </p>
                <p>
                    The data currently displayed in the sequence visualization can be <strong>exported</strong> in JSON format
                    by clicking the download icon.
                </p>
                <p>
                    The panel can be also used to <strong>select one or multiple similar protein structures</strong> to be visualized
                    in the both visualizations. After selecting the proteins, one must confirm the selection by clicking the Confirm button.
                </p>
            </section>

            <section id="sequence-visualization">
                <h4>Sequence visualization</h4>
                <p>
                    There are several properties that are displayed in the sequence visualization:
                    <ul>
                        <li>Sequence of submitted protein (just the selected chain).</li>
                        <li>
                            Selected sequences of proteins similar to the submitted protein (one row displays just one similar chain).
                            <ul>
                                <li>Selected sequences are aligned only with the query protein sequence, not with each other.</li>
                            </ul>
                        </li>
                        <li>
                            Colored rectangles under protein X depict areas with predicted pockets and real binding areas (if available) of the X.
                            Real binding sites are residues within 5&nbsp;&#8491; from any ligand atom.
                            <ul>
                                <li>Connected rectangles form one bindings site.</li>
                                <li>
                                    Bindings sites of the same ligand share the same color,
                                    e.g. SO4 on the protein X would have the same color as SO4 on the protein Y.
                                </li>
                                <li>
                                    Different rectangles may have varying levels of transparency, depending on the probability
                                    of the binding site existing. The more transparent a rectangle is, the lower the probability
                                    of the existence of that binding site. For example, binding sites provided by Foldseek
                                    are experimentally confirmed rather than predicted, so their probability is 1 (i.e., no transparency).
                                </li>
                            </ul>
                        </li>
                        <li>
                            If available (and selected), conservation scores are portrayed using a bar chart on the bottom side
                            of the visualization.
                        </li>
                    </ul>
                </p>
                <p>
                    The background of rows displaying similar proteins or binding sites is colored according to the data source.
                    Each data source is assigned a specific color. Which color belongs to which data source can be viewed
                    in the <strong>legend</strong> under the sequence visualization. Alternatively, when hovered
                    on sequence residue or binding site, the information about the source is displayed in the tooltip.
                </p>
                <p>
                    <strong>Tooltip</strong> can display not only source where the data came from, but also information such as:
                    <ul>
                        <li><em>Position</em> in the viewer where the mouse currently hovers (along with the residue letter).</li>
                        <li><em>Probability</em> of the binding site existing.</li>
                        <li><em>Source</em> of the data.</li>
                        <li><em>Name</em> of the pocket or ligand (displayed only if the "squash" feature is enabled).</li>
                        <li>(Conservation) <em>Value</em> of the currently hovered query protein residue.</li>
                    </ul>
                </p>
                <p>
                    As one <strong>hovers</strong> over the sequence with mouse, apart from the fact that the tooltip is displayed,
                    the residues are highlighted in the 3D visualization. This feature allows to analyze the protein
                    both from the structural and sequential point of view. By default, the sequence view is zoomed out
                    so that the whole protein is displayed. You can use your mouse to zoom in, or zoom
                    to the selected residue by <strong>clicking</strong> the responsible area.
                </p>
            </section>

            <section id="structural-visualization">
                <h4>Structural visualization</h4>
                <p>
                    This part of the website contains the three-dimensional visualization of the protein:
                    <ul>
                        <li>By default, the submitted protein structure is displayed.</li>
                        <li>
                            For displaying more structures, one must select them from the settings panel located
                            above the sequence visualization, and confirm the selection.
                            <ul>
                                <li>The displayed proteins are aligned and superposed.</li>
                                <li>
                                    <strong>ATTENTION!</strong> Aligning and superposing may fail, possibly due to some
                                    of the selected proteins containing <a href="https://www.rcsb.org/ligand/UNK"
                                        target="_blank" rel="noopener noreferrer"><em>unknown residues</em></a>. If the process fails,
                                    warning will appear and only the query protein will be displayed in the structural visualization.
                                </li>
                            </ul>
                        </li>
                        <li>
                            For displaying individual pocket areas or ligands (if available),
                            the one needs to select the required parts from the panels under the visualization.
                        </li>
                        <li>
                            Above the visualization, the switch (<strong>Support-Based Highlighting</strong>) is present.
                            Look below for more info about the mode.
                        </li>
                    </ul>
                </p>
            </section>

            <section id="controls">
                <h5>Controls</h5>
                <p>
                    The molecule can be rotated by moving mouse while holding left mouse button.
                    On a touch device, just slide your finger.
                    To zoom in or out, use your mouse wheel button or use the pinch gesture on a touch display.
                    In order to move the protein, hold the right mouse button.
                    Lastly, for slabbing the protein, scroll the mouse wheel or use the three finger gesture.
                </p>
                <p>
                    Using the buttons in the top-right corner, one can:
                    <ul>
                        <li>Reset the camera.</li>
                        <li>Create a snapshot of current visualization.</li>
                        <li>Toggle the advanced control panel.</li>
                        <li>Toggle full-screen mode.</li>
                        <li>
                            Setup the scene such as the visualization background or the field of view.
                        </li>
                        <li>Toggle the selection mode.</li>
                    </ul>
                </p>
                <p>
                    For more help with Mol*, please visit its <a href="https://molstar.org/viewer-docs/" target="_blank"
                        rel="noopener noreferrer">official page</a> or the <a href="https://github.com/molstar/molstar/"
                            target="_blank" rel="noopener noreferrer">GitHub page</a>.
                </p>
            </section>

            <section id="highlight-mode">
                <h5>Support-Based Highlighting</h5>
                <p>
                    <strong>Support-Based Highlighting</strong> enhances the visualization of binding sites in the structure display
                    by adjusting the transparency of residues based on supporting data.
                </p>
                <p>
                    When enabled, residues identified as part of a binding site are displayed with varying transparency levels:
                    <ul>
                        <li><strong>More opaque residues</strong> are supported by a greater number of data sources.</li>
                        <li><strong>More transparent residues</strong> are supported by fewer sources.</li>
                    </ul>
                </p>
                <p>
                    This allows to visually assess the level of confidence or agreement across data sources
                    for each residue's involvement in the binding site.
                </p>
                <p>
                    When Support-Based Highlighting is turned off, all binding site residues are shown
                    in the same solid color with no transparency, regardless of supporting data.
                </p>
            </section>

            <section id="conservation">
                <h3>Conservation</h3>
                <p>
                    Besides selecting what protein to analyze, one can also specify whether evolutionary conservation should be
                    included in the P2Rank prediction by checking the <em>Use conservation</em> checkbox. Slightly modified
                    <a href="https://github.com/cusbg/prankweb/blob/main/conservation/hmm_based/conservation_hmm_based.py"> script </a>
                    is used to calculate per-position information content (IC) values for amino acid residues which is between 0 and ~ 4 ( = log2(20) )
                    with higher values corresponding to higher conservation.
                    <a href="https://ftp.expasy.org/databases/uniprot/current_release/knowledgebase/complete/uniprot_sprot.fasta.gz">
                        &nbsp; UniProtKB/Swiss-Prot </a>
                    protein sequence database is used as the single target sequence database.
                </p>
            </section>

            <section id="contact-us">
                <h2>Contact us</h2>
                <p>
                    Something is not working or are you missing certain functionality/feature?
                    Please let us know by creating a <a href="https://github.com/milantru/prankweb/issues/new/choose"
                        target="_blank" rel="noopener noreferrer">GitHub issue</a>.
                </p>
            </section>
        </div>
    );
}

export default Help;
