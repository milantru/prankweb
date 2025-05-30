import Footer from "../../shared/components/Footer";
import QueryProteinForm from "./components/QueryProteinForm";

function Home() {
	return (
		<>
			<div className="container index-view" style={{ marginTop: "3rem" }}>
				<h1 className="text-center">
					Plankweb: Ligand Binding Site Analysis
				</h1>
				<p className="text-center description"> 
					Plankweb integrates diverse data sources and computational methods to enhance the analysis of 
					protein structures and the prediction of ligand binding sites. 
				</p>

				<QueryProteinForm />

				<div style={{ clear: "both" }}>
					<Footer />
				</div>
			</div>
		</>
	);
}

export default Home;
