import { useEffect, createRef } from "react";
import { createPluginUI } from "molstar/lib/mol-plugin-ui";
import { renderReact18 } from "molstar/lib/mol-plugin-ui/react18";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
/*  Might require extra configuration,
see https://webpack.js.org/loaders/sass-loader/ for example.
create-react-app should support this natively. */
import "molstar/lib/mol-plugin-ui/skin/light.scss";
import { DefaultPluginUISpec } from "molstar/lib/mol-plugin-ui/spec";
import { ChainResult, ChainResults, ProcessedResult } from "../AnalyticalPage";
import { StateObjectRef, StateObjectSelector } from "molstar/lib/mol-state";
import { Asset } from "molstar/lib/mol-util/assets";
import { MolScriptBuilder as MS } from "molstar/lib/mol-script/language/builder";
import { QueryContext, StructureElement, StructureSelection } from "molstar/lib/mol-model/structure";
import { compile } from "molstar/lib/mol-script/runtime/query/compiler";
import { superpose } from "molstar/lib/mol-model/structure/structure/util/superposition";
import { PluginContext } from "molstar/lib/mol-plugin/context";
import { PluginStateObject as PSO } from "molstar/lib/mol-plugin-state/objects";
import { Expression } from "molstar/lib/mol-script/language/expression";
import { Mat4 } from "molstar/lib/mol-math/linear-algebra";
import { StateTransforms } from "molstar/lib/mol-plugin-state/transforms";
import { BuiltInTrajectoryFormat } from "molstar/lib/mol-plugin-state/formats/trajectory";
import { MinimizeRmsd } from "molstar/lib/mol-math/linear-algebra/3d/minimize-rmsd";

declare global {
	interface Window {
		molstar?: PluginUIContext;
	}
}

type Props = {
	chainResults: ChainResults;
	selectedChain: string;
	selectedStructureUrls: string[];
};

export function MolStarWrapper({ chainResults, selectedChain, selectedStructureUrls }: Props) {
	const chainResult = chainResults[selectedChain];
	if (!chainResult) {
		return <div>No data for the selected chain.</div>
	}
	const querySequenceUrl = getQuerySequenceUrl(chainResult);
	let tmp = [querySequenceUrl, ...selectedStructureUrls]
	const pdbUrls = tmp.map(x => x.replace("apache", "localhost")); // TODO: Delete map with replace
	if (pdbUrls.length === 0) {
		// At least one structure is always expected, but this check is added as a defensive programming measure.
		return <div>No structures provided.</div>
	}
	const parent = createRef<HTMLDivElement>();

	// In debug mode of react's strict mode, this code will
	// be called twice in a row, which might result in unexpected behavior.
	useEffect(() => {
		async function init() {
			const plugin = await createPluginUI({
				target: parent.current,
				render: renderReact18,
				spec: {
					...DefaultPluginUISpec(),
					layout: {
						initial: {
							isExpanded: false,
							showControls: true,
							controlsDisplay: "reactive",
							regionState: {
								top: "hidden",    //sequence
								left: (window.innerWidth > 1200) ? "collapsed" : "hidden",
								//tree with some components, hide for small and medium screens
								bottom: "hidden", //shows log information
								right: "hidden"   //structure tools
							}
						}
					},
					components: {
						remoteState: "none"
					}
				}
			});

			window.molstar = plugin;

			loadNewStructures(plugin, pdbUrls, "pdb", selectedChain);
		}

		init();

		return () => {
			window.molstar?.dispose();
			window.molstar = undefined;
		};
	}, []);

	useEffect(() => {
		const plugin: PluginUIContext = window.molstar;
		if (!plugin) {
			return;
		}

		loadNewStructures(plugin, pdbUrls, "pdb", selectedChain);
	}, [/*chainResult, */selectedStructureUrls, selectedChain]); // TODO is not dependant on chainResult because query seq should not change

	return (
		<div ref={parent} style={{ position: "relative", height: "70vh", width: "45vw" }}></div>
	);

	function getQuerySequenceUrl(chainResult: ChainResult) {
		const dseResults = Object.values(chainResult.dataSourceExecutorResults) as ProcessedResult[];
		if (dseResults.length === 0) {
			/* No query sequence pdb url, this should not happen. */
			throw new Error("No query sequence url."); // TODO
		}

		// For all results should be query seq pdb url the same, we take the one at index 0
		const querySequenceUrl = dseResults[0].pdbUrl;
		return querySequenceUrl;
	}

	function transform(plugin: PluginContext, s: StateObjectRef<PSO.Molecule.Structure>, matrix: Mat4) {
		const b = plugin.state.data.build().to(s)
			.insert(StateTransforms.Model.TransformStructureConformation, { transform: { name: "matrix", params: { data: matrix, transpose: false } } });
		return plugin.runTask(plugin.state.data.updateTree(b));
	}

	async function siteVisual(plugin: PluginContext, s: StateObjectRef<PSO.Molecule.Structure>, pivot: Expression, rest: Expression) {
		const center = await plugin.builders.structure.tryCreateComponentFromExpression(s, pivot, "pivot");
		if (center) await plugin.builders.structure.representation.addRepresentation(center, { type: "cartoon", color: "model-index" });

		const surr = await plugin.builders.structure.tryCreateComponentFromExpression(s, rest, "rest");
		if (surr) await plugin.builders.structure.representation.addRepresentation(surr, { type: "ball-and-stick"/*, color: "uniform", size: "uniform", sizeParams: { value: 0.33 }*/ }); // TODO
	}

	async function _loadStructure(plugin: PluginContext, structureUrl: string, format: BuiltInTrajectoryFormat) {
		const data = await plugin.builders.data.download({
			url: Asset.Url(structureUrl),
			isBinary: false
		}, { state: { isGhost: true } });

		const trajectory = await plugin.builders.structure.parseTrajectory(data, format);

		const model = await plugin.builders.structure.createModel(trajectory);
		const structure: StateObjectSelector = await plugin.builders.structure.createStructure(model, { name: "model", params: {} });

		return structure;
	}

	function performDynamicSuperposition(plugin: PluginContext, structureUrls: string[], format: BuiltInTrajectoryFormat, chain: string) {
		return plugin.dataTransaction(async () => {
			for (const structureUrl of structureUrls) {
				await _loadStructure(plugin, structureUrl, format);
			}

			const pivot = MS.struct.generator.atomGroups({
				"chain-test": MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), chain])
			});

			const rest = MS.struct.modifier.exceptBy({
				0: MS.struct.modifier.includeSurroundings({
					0: pivot,
					radius: 5
				}),
				by: pivot
			});

			const query = compile<StructureSelection>(pivot);
			const xs = plugin.managers.structure.hierarchy.current.structures;
			if (xs.length === 0) {
				console.warn("No structures to display.");
				return;
			}
			let selections: StructureElement.Loci[] | null = null;
			let transforms: MinimizeRmsd.Result[] = null!;
			if (xs.length > 1) { // At least 1 similar protein structure selected (not only query protein is being visualised)
				selections = xs.map(s => StructureSelection.toLociWithCurrentUnits(query(new QueryContext(s.cell.obj!.data))));
				transforms = superpose(selections);
			}

			await siteVisual(plugin, xs[0].cell, pivot, rest);
			for (let i = 1; i < (selections?.length ?? 1); i++) {
				await transform(plugin, xs[i].cell, transforms[i - 1].bTransform);
				await siteVisual(plugin, xs[i].cell, pivot, rest);
			}
		});
	}

	async function loadNewStructures(plugin: PluginUIContext, structureUrls: string[], format: BuiltInTrajectoryFormat, chain: string) {
		await plugin.clear();
		await performDynamicSuperposition(plugin, structureUrls, format, chain);
	}
}
