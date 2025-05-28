import Footer from "../../shared/components/Footer";

function About() {
    return (
        <div className="container">
            <h1 id="about">About</h1>
            <p>
                Proteins are fundamental building blocks of all living organisms. They
                perform their function by binding to other molecules. This project deals
                with interactions between proteins and small molecules (so called
                ligands) because most of the currently used drugs are small molecules.
                As part of our&nbsp;<a href="https://is.cuni.cz/studium/predmety/index.php?do=predmet&kod=NPRG069"
                    target="_blank" rel="noopener noreferrer">university&nbsp;software&nbsp;project</a>, we
                developed <strong>PlankWeb</strong>, a web application that builds upon ideas from the
                existing <a href="https://prankweb.cz/" target="_blank" rel="noopener noreferrer">PrankWeb</a>.
                Our goal was to create a modern, user-friendly web application for structure and sequence
                visualization of a protein and its protein-ligand binding sites. We hope that it will provide a quick
                and convenient way for scientists to analyze proteins.
            </p>

            <h2 id="data-sources">Data sources</h2>
            <p>
                The application uses the following data sources:
            </p>

            <h3 id="p2rank">P2Rank</h3>
            <p>
                <a href="https://github.com/cusbg/p2rank-framework" target="_blank" rel="noopener noreferrer">P2Rank</a> is
                a machine learning-based method for predicting ligand-binding pockets in proteins.
                In the application, the model is used to predict which residues are part of specific binding sites.
            </p>

            <h3 id="esm2">ESM-2</h3>
            <p>
                <a href="https://github.com/facebookresearch/esm" target="_blank" rel="noopener noreferrer">ESM-2</a> is a
                protein Language Model (pLM) that we use to generate embeddings for each residue.
                These embeddings are then passed to a classification neural network to determine whether
                a residue is part of a binding site without any information about the protein 3D structure.
            </p>

            <h3 id="foldseek">Foldseek</h3>
            <p>
                <a href="https://github.com/steineggerlab/foldseek" target="_blank" rel="noopener noreferrer">Foldseek</a> is a
                tool which enables fast and sensitive comparisons of large protein structure sets,
                supporting monomer and multimer searches, as well as clustering. We use it with the <strong>PDB100 database</strong> to get
                the proteins most similar to the submitted protein, along with their associated data.
            </p>

            <h2 id="structure-prediction">Structure prediction</h2>
            <p>
                For sequence input, the application uses the <a href="https://esmatlas.com/resources?action=fold" target="_blank" rel="noopener noreferrer">ESMFold API</a>
                to predict the 3D structure of the provided protein sequence.
            </p>

            <Footer />
        </div>
    );
}

export default About;
