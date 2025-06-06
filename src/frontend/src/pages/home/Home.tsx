import QueryProteinForm from "./components/QueryProteinForm";

function Home() {
	return (
		<>
			<div className="container index-view" style={{ marginTop: "3rem" }}>
				<h1 className="text-center">
					PlankWeb: Ligand Binding Site Analysis
				</h1>
				<p className="text-center description"> 
					PlankWeb integrates diverse data sources and computational methods to enhance the analysis of 
					protein structures and the prediction of ligand binding sites. 
				</p>

				<QueryProteinForm />
			</div>
		</>
	);
}

export default Home;
