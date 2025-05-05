import { useEffect, createRef, useState, forwardRef, useImperativeHandle } from "react";
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
import { setSubtreeVisibility } from 'molstar/lib/mol-plugin/behavior/static/state';

export type MolStarWrapperHandle = {
	toggleQueryProteinLigand: (dataSourceName: string, chain: string, ligandId: string, show: boolean) => void;
	toggleSimilarProteinLigand: (dataSourceName: string, pdbCode: string, chain: string, ligandId: string, show: boolean) => void;
	toggleProteinStructure: (dataSourceName: string, pdbCode: string, chain: string, show: boolean) => void;
	hideAllProteinStructures: () => void;
};

declare global {
	interface Window {
		molstar?: PluginUIContext;
	}
}

type Props = {
	chainResults: ChainResults;
	selectedChain: string;
	onStructuresLoadingStart: () => void;
	onStructuresLoadingEnd: () => void;
};

export const MolStarWrapper = forwardRef(({ chainResults, selectedChain, onStructuresLoadingStart, onStructuresLoadingEnd }: Props, ref) => {
	const chainResult = chainResults[selectedChain];
	if (!chainResult) {
		return <div>No data for the selected chain.</div>
	}
	const parent = createRef<HTMLDivElement>();
	const [queryStructure, setQueryStructure] = useState<StateObjectSelector>(null!);
	const [structures, setStructures] = useState<Record<string, Record<string, Record<string, StateObjectSelector>>>>({});
	const [queryProteinLigands, setQueryProteinLigands] = useState<Record<string, Record<string, Record<string, StateObjectSelector>>>>({});
	const [similarProteinLigands, setSimilarProteinLigands] = useState<Record<string, Record<string, Record<string, Record<string, StateObjectSelector>>>>>({});

	useImperativeHandle(ref, () => ({
		toggleQueryProteinLigand,
		toggleSimilarProteinLigand,
		toggleProteinStructure,
		hideAllProteinStructures
	}));

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
							showControls: false,
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

			loadNewStructures(plugin, "pdb", selectedChain);
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

		loadNewStructures(plugin, "pdb", selectedChain);
	}, [/*chainResult, */selectedChain]); // TODO is not dependant on chainResult because query seq should not change

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

	async function createLigandsRepresentationForStruct(
		plugin: PluginContext,
		struct: StateObjectSelector,
		key: string,
		ligandsQueryExpression: Expression
	) {
		const l = await plugin.builders.structure.tryCreateComponentFromExpression(struct, ligandsQueryExpression, key);
		if (!l) {
			return null;
		}

		await plugin.builders.structure.representation.addRepresentation(l, { type: "ball-and-stick" });
		setVisibility(l, false);

		return l;
	}

	async function createLigandsRepresentationForStructs(
		plugin: PluginContext,
		structs: Record<string, Record<string, Record<string, StateObjectSelector>>>,
		ligandsExpression: Record<string, Record<string, Record<string, Record<string, Expression>>>>
	) {
		const ls: Record<string, Record<string, Record<string, Record<string, StateObjectSelector>>>> = {};
		for (const [dataSourceName, result] of Object.entries(chainResult.dataSourceExecutorResults)) {
			if (!result.similarProteins) {
				continue;
			}

			for (const simProt of result.similarProteins) {
				for (const bindingSite of simProt.bindingSites) {
					const struct = structs[dataSourceName][simProt.pdbId][simProt.chain];
					const key = `${dataSourceName}-${simProt.pdbId}-${simProt.chain}-${bindingSite.id}`;
					const ligandsOfOneType = ligandsExpression[dataSourceName][simProt.pdbId][simProt.chain][bindingSite.id];

					const l = await createLigandsRepresentationForStruct(plugin, struct, key, ligandsOfOneType);
					if (l) {
						if (!(dataSourceName in ls)) {
							ls[dataSourceName] = {};
						}
						if (!(simProt.pdbId in ls[dataSourceName])) {
							ls[dataSourceName][simProt.pdbId] = {};
						}
						if (!(simProt.chain in ls[dataSourceName][simProt.pdbId])) {
							ls[dataSourceName][simProt.pdbId][simProt.chain] = {};
						}
						ls[dataSourceName][simProt.pdbId][simProt.chain][bindingSite.id] = l;
					} else {
						console.warn("Failed to create ligand representation. Data: ", dataSourceName, simProt.pdbId, selectedChain, bindingSite.id);
					}
				}
			}
		}
		setSimilarProteinLigands(ls);
	}

	async function createStructureRepresentation(
		plugin: PluginContext,
		stateObjectRef: StateObjectRef<PSO.Molecule.Structure>,
		pivotExpression: Expression,
		restExpression: Expression,
		show: boolean
	) {
		// Pivot
		const center = await plugin.builders.structure.tryCreateComponentFromExpression(stateObjectRef, pivotExpression, "pivot");
		if (center) {
			await plugin.builders.structure.representation.addRepresentation(center, { type: "cartoon", color: "model-index" });
			setVisibility(center, show);
		}

		// TODO
		// const surr = await plugin.builders.structure.tryCreateComponentFromExpression(s, rest, "rest");
		// if (surr) await plugin.builders.structure.representation.addRepresentation(surr, { type: "ball-and-stick"/*, color: "uniform", size: "uniform", sizeParams: { value: 0.33 }*/ }); // TODO
	}

	async function _loadStructure(plugin: PluginContext, structureUrl: string, format: BuiltInTrajectoryFormat) {
		structureUrl = structureUrl.replace("apache", "localhost"); // TODO tmp fix, can be deleted later
		const data = await plugin.builders.data.download({
			url: Asset.Url(structureUrl),
			isBinary: false
		}, { state: { isGhost: true } });

		const trajectory = await plugin.builders.structure.parseTrajectory(data, format);

		const model = await plugin.builders.structure.createModel(trajectory);
		const structure: StateObjectSelector = await plugin.builders.structure.createStructure(model, { name: "model", params: {} });

		return structure;
	}

	function setVisibility(selector: StateObjectSelector, show: boolean, plugin: PluginContext | null = null) {
		if (!plugin) {
			plugin = window.molstar;
			if (!plugin) {
				return;
			}
		}

		setSubtreeVisibility(plugin.state.data, selector.ref, !show);
	}

	function performDynamicSuperposition(plugin: PluginContext, format: BuiltInTrajectoryFormat, chain: string) {
		return plugin.dataTransaction(async () => {
			// Load query protein structure
			const querySequenceUrl = getQuerySequenceUrl(chainResult);
			const queryStructureTmp = await _loadStructure(plugin, querySequenceUrl, format);
			setQueryStructure(queryStructureTmp);

			const queryProteinLigandsExpression: Record<string, Record<string, Record<string, Expression>>> = {};
			const dseResult = chainResult.dataSourceExecutorResults
			for (const [dataSourceName, result] of Object.entries(dseResult)) {
				for (const bindingSite of result.bindingSites) {
					const ligandLabel = bindingSite.id.substring(bindingSite.id.indexOf("_") + 1); // e.g. "H_SO4" -> "SO4"
					const ligandsOfOneType = MS.struct.generator.atomGroups({
						'residue-test': MS.core.rel.eq([
							MS.struct.atomProperty.macromolecular.auth_comp_id(), ligandLabel
						]),
						'group-by': MS.struct.atomProperty.macromolecular.residueKey()
					});

					if (!(dataSourceName in queryProteinLigandsExpression)) {
						queryProteinLigandsExpression[dataSourceName] = {};
					}
					if (!(selectedChain in queryProteinLigandsExpression[dataSourceName])) {
						queryProteinLigandsExpression[dataSourceName][selectedChain] = {};
					}
					queryProteinLigandsExpression[dataSourceName][selectedChain][bindingSite.id] = ligandsOfOneType;
				}
			}

			// Load similar proteins structures
			const structuresTmp: Record<string, Record<string, Record<string, StateObjectSelector>>> = {};
			for (const [dataSourceName, result] of Object.entries(chainResult.dataSourceExecutorResults)) {
				if (!result.similarProteins) {
					continue;
				}

				for (const simProt of result.similarProteins) {
					if (!(dataSourceName in structuresTmp)) {
						structuresTmp[dataSourceName] = {};
					}
					if (!(simProt.pdbId in structuresTmp[dataSourceName])) {
						structuresTmp[dataSourceName][simProt.pdbId] = {};
					}
					const structure = await _loadStructure(plugin, simProt.pdbUrl, format);
					structuresTmp[dataSourceName][simProt.pdbId][simProt.chain] = structure;
				}
			}
			setStructures(structuresTmp);

			const similarProteinLigandsExpression: Record<string, Record<string, Record<string, Record<string, Expression>>>> = {};
			for (const [dataSourceName, result] of Object.entries(chainResult.dataSourceExecutorResults)) {
				if (!result.similarProteins) {
					continue;
				}

				for (const simProt of result.similarProteins) {
					for (const bindingSite of simProt.bindingSites) {
						const ligandLabel = bindingSite.id.substring(bindingSite.id.indexOf("_") + 1); // e.g. "H_SO4" -> "SO4"
						const ligandsOfOneType = MS.struct.generator.atomGroups({
							'residue-test': MS.core.rel.eq([
								MS.struct.atomProperty.macromolecular.auth_comp_id(), ligandLabel
							]),
							'group-by': MS.struct.atomProperty.macromolecular.residueKey()
						});

						if (!(dataSourceName in similarProteinLigandsExpression)) {
							similarProteinLigandsExpression[dataSourceName] = {};
						}
						if (!(simProt.pdbId in similarProteinLigandsExpression[dataSourceName])) {
							similarProteinLigandsExpression[dataSourceName][simProt.pdbId] = {};
						}
						if (!(simProt.chain in similarProteinLigandsExpression[dataSourceName][simProt.pdbId])) {
							similarProteinLigandsExpression[dataSourceName][simProt.pdbId][simProt.chain] = {};
						}
						similarProteinLigandsExpression[dataSourceName][simProt.pdbId][simProt.chain][bindingSite.id] = ligandsOfOneType;
					}
				}
			}

			const pivot = MS.struct.generator.atomGroups({
				"chain-test": MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), chain])
			});
			// TODO OTAZKA: nepouzit radsej toto?:
			// const pivot = MS.struct.generator.atomGroups({
			// 	"chain-test": MS.core.logic.and([
			// 		MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), chain]),
			// 		queryStructureTmp.ref
			// 	])
			// });

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

			// Create representation of query protein structure
			await createStructureRepresentation(plugin, xs[0].cell, pivot, rest, true);

			// Create representations of query protein ligands
			const queryProteinLigandsTmp: Record<string, Record<string, Record<string, StateObjectSelector>>> = {};
			for (const [dataSourceName, result] of Object.entries(dseResult)) {
				for (const bindingSite of result.bindingSites) {
					const key = `${dataSourceName}-${selectedChain}-${bindingSite.id}`;
					const ligandOfOneTypeExpr = queryProteinLigandsExpression[dataSourceName][selectedChain][bindingSite.id];

					const l = await createLigandsRepresentationForStruct(plugin, queryStructureTmp, key, ligandOfOneTypeExpr);
					if (l) {
						if (!(dataSourceName in queryProteinLigandsTmp)) {
							queryProteinLigandsTmp[dataSourceName] = {};
						}
						if (!(selectedChain in queryProteinLigandsTmp[dataSourceName])) {
							queryProteinLigandsTmp[dataSourceName][selectedChain] = {};
						}
						queryProteinLigandsTmp[dataSourceName][selectedChain][bindingSite.id] = l;
					} else {
						console.warn("Failed to create ligand representation. Data: ", dataSourceName, selectedChain, bindingSite.id);
					}
				}
			}
			setQueryProteinLigands(queryProteinLigandsTmp);

			// Create representations of similar protein structures
			for (let i = 1; i < (selections?.length ?? 1); i++) {
				await transform(plugin, xs[i].cell, transforms[i - 1].bTransform);
				await createStructureRepresentation(plugin, xs[i].cell, pivot, rest, false);
			}

			// Create representations of similar protein ligands
			await createLigandsRepresentationForStructs(plugin, structuresTmp, similarProteinLigandsExpression);
		});
	}

	async function loadNewStructures(plugin: PluginUIContext, format: BuiltInTrajectoryFormat, chain: string) {
		onStructuresLoadingStart();
		await plugin.clear();
		await performDynamicSuperposition(plugin, format, chain);
		onStructuresLoadingEnd();
	}

	function toggleQueryProteinLigand(dataSourceName: string, chain: string, ligandId: string, show: boolean) {
		const ligand = queryProteinLigands[dataSourceName][chain][ligandId];
		if (ligand) {
			setVisibility(ligand, show);
		} else {
			console.warn(`Failed to toggle ligand... Data: `, dataSourceName, chain, ligandId, show);
		}
	}

	function toggleSimilarProteinLigand(dataSourceName: string, pdbCode: string, chain: string, ligandId: string, show: boolean) {
		const ligand = similarProteinLigands[dataSourceName][pdbCode][chain][ligandId];
		if (ligand) {
			setVisibility(ligand, show);
		} else {
			console.warn(`Failed to toggle ligand... Data: `, dataSourceName, pdbCode, chain, ligandId, show);
		}
	}

	function toggleProteinStructure(dataSourceName: string, pdbCode: string, chain: string, show: boolean) {
		const struct = structures[dataSourceName][pdbCode][chain];
		if (struct) {
			setVisibility(struct, show);
			// When protein structure is displayed, the ligands are as well, so we hide them
			for (const ligand of Object.values(similarProteinLigands[dataSourceName][pdbCode][chain])) {
				setVisibility(ligand, false);
			}
		} else {
			console.warn(`Failed to toggle struct... Data: `, dataSourceName, pdbCode, chain, show);
		}
	}

	function hideAllProteinStructures() {
		for (const dataSourceRecord of Object.values(structures)) {
			for (const chainRecord of Object.values(dataSourceRecord)) {
				for (const structure of Object.values(chainRecord)) {
					setVisibility(structure, false);
				}
			}
		}
	}
});
