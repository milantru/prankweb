import QueryProteinForm from "./components/QueryProteinForm";

function Home() {
	return (
		<>
			<div className="container index-view" style={{marginTop: "3rem"}}>
				<h1 className="text-center">
					PlankWeb: Ligand Binding Site Analysis
				</h1>
				<p className="text-center description">
					PlankWeb builds upon P2Rank and pLM - a machine and deep learning-based methods for prediction of ligand binding sites from
					protein structure.
				</p>

				<QueryProteinForm />

				<div style={{clear: "both"}}>
					{/* @require("../partials/footer.html") */}
				</div>
			</div>
			{/* @require("../partials/ga.html") */}
		</>
	);
}

export default Home;
