function Help() {
    return (
        <div className="container">
            <h1 id="user-guide">User guide</h1>
            <p>
                PlankWeb is a web-based application that allows to predict and visualize protein-ligand binding sites.
                Furthermore, it allows to compare the location of predicted pockets with highly conserved areas as well as actual
                ligand binding sites.
                All one needs to use PlankWeb is a device with a web-browser that supports WebGL.
            </p>

            <h2 id="quick-start">Quick start</h2>

            <h3>Structure selection</h3>
            <p>
                The user can specify what protein to analyze in four ways:
            </p>
            <ul>
                <li>PDB code <em>(Experimental structure)</em></li>
                <li>Upload a structure file (.pdb) with selected chains <em>(Custom structure)</em></li>
                <li>Uniprot ID <em>(AlphaFold structure)</em></li>
                <li>Text sequence <em>(Sequence)</em></li>
            </ul>
            <p>
                The user may also specify whether to <strong>use evolutionary conservation</strong> in the prediction model. This
                makes the analysis more accurate. The conservation score calculated represents protein similarity to
                other proteins in the same family. More information available <a href="#conservation">below</a>.
            </p>

            <h3 id="analytical-page">Analytical page</h3>
            <p>
                Once the protein is submitted, user is redirected to the analytical page where when the calculations are finished
                the <a href="#settings-panel"><em>settings panel</em></a> and two visualizations
                appear: <a href="#sequence-visualization"><em>sequence visualization</em></a> and <a href="#structural-visualization"><em>structural visualization</em></a>.
            </p>

            <h4 id="settings-panel">Settings panel</h4>
            <p>
                This panel can be used to switch between different chains of the submitted protein.
                Changing the chain will also update the contents of the sequence visualization. Apart from that,
                in the structural visualization the structures are superpositioned according to the selected chain.
            </p>
            <p>
                Using the panel, user can also choose to "squash" the binding sites to save space in sequence visualization.
            </p>
            <p>
                The panel can be also used to select one or multiple similar protein structures to be visualized in the structural visualization.
            </p>

            <h4 id="sequence-visualization">Sequence visualization</h4>
            <p>There are several properties that are displayed in the sequence visualization:</p>
            <ul>
                <li>Sequence of submitted protein (just the selected chain)</li>
                <li>Sequences of proteins similar to the submitted protein (one row displays just one similar chain)</li>
                <li>
                    Colored rectangles depict areas with predicted pockets and real binding areas (if available).
                    Real binding sites are residues within 4,2 &#8491; from any ligand atom.
                </li>
                <li>If available (and selected), conservation scores are portrayed using a bar chart.</li>
            </ul>
            {/* TODO */}
            {/* <p>
                As one hovers over the sequence with mouse, the residues are highlighted in the 3D visualization.
                This feature allows to analyze the protein both from the structural and sequential point of view.
                By default, the sequence view is zoomed out so that the whole protein is displayed.
                You can use your mouse to zoom in, or zoom to the selected residue by clicking the responsible area.
            </p> */}

            <h4 id="structural-visualization">Structural visualization</h4>
            <p>
                This part of the website contains the three-dimensional visualization of the protein.
                <ul>
                    <li>By default, the submitted protein structure is displayed.</li>
                    <li>
                        For displaying individual pocket areas or ligands (if available),
                        the one needs to select the required parts from the panels under the visualisation.
                    </li>
                    <li>
                        Above the visualisation the switch (<em>Highlight mode</em>) is present.
                        Switching it on, enables the mode in which the displayed pockets are transparent.
                        The less transparency, the more data sources support that the residue is part of the binding site.
                    </li>
                </ul>
            </p>

            <h5 id="controls">Controls</h5>
            <p>
                The molecule can be rotated by moving mouse while holding left mouse button.
                On a touch device, just slide your finger.
                To zoom in or out, use your mouse wheel button or use the pinch gesture on a touch display.
                In order to move the protein, hold the right mouse button.
                Lastly, for slabbing the protein, scroll the mouse wheel or use the three finger gesture.
            </p>
            <p>Using the buttons in the top-right corner, one can:</p>
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
            <p>
                For more help with Mol*, please visit its <a href="https://molstar.org/viewer-docs/" target="_blank"
                    rel="noopener noreferrer">official page</a> or the <a href="https://github.com/molstar/molstar/"
                        target="_blank" rel="noopener noreferrer">GitHub page</a>.
            </p>

            <h3 id="conservation">Conservation</h3>
            <p>
                Besides selecting what protein to analyze, one can also specify whether evolutionary conservation should be
                included in the prediction model by checking the <em>Use conservation</em> checkbox.
            </p>
            <p>
                The new conservation pipeline operates as follows.
                First, polypeptide chain sequences are extracted from the input file using P2Rank.
                The phmmer tool from the <a href="http://hmmer.org/" target="_blank" rel="noopener noreferrer">HMMER
                    software package</a> is then used to identify and align similar sequences for each respective query; UniRef50
                Release 2021 03 is used as the single target sequence database.
                Up to 1,000 sequences are then randomly selected from each MSA to form the respective sample MSAs; weights are
                assigned to the individual sequences constituting the sample MSAs using the Gerstein/Sonnhammer/Chothia algorithm
                implemented in the <em>esl-weigh</em> miniapp included with the HMMER software.
                Finally, per-column information content (i.e., conservation score) and gap character frequency values are
                calculated using the <em>esl-alistat</em> miniapp, taking the individual sequence weights into account; positions
                containing the gap character in more than 50% of sequences are masked to appear as possessing no conservation at
                all.
            </p>
            <p>
                The range of the conservation corresponds to the range of the per-residue of information content which is between
                0 and ~&nbsp;4 (&nbsp;=&nbsp;log<sub>2</sub>(20)&nbsp;) with higher values corresponding to higher conservation.
            </p>

            <h2 id="contact-us">Contact us</h2>
            <p>
                Something is not working or are you missing certain functionality/feature?
                Please let us know by creating a <a href="https://github.com/milantru/prankweb/issues/new/choose"
                    target="_blank" rel="noopener noreferrer">GitHub issue</a>.
            </p>
        </div>
    );
}

export default Help;
