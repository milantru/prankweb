import { useEffect, createRef, forwardRef, useImperativeHandle, useRef } from "react";
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
	toggleSimilarProteinStructure: (dataSourceName: string, pdbCode: string, chain: string, show: boolean) => void;
	hideAllSimilarProteinStructures: () => void;
};

declare global {
	interface Window {
		molstar?: PluginUIContext;
	}
}

type VisibleObject = {
	object: StateObjectSelector;
	isVisible: boolean;
};

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
	const queryStructure = useRef<VisibleObject>(null!);
	const structures = useRef<Record<string, Record<string, Record<string, VisibleObject>>>>({});
	const queryProteinLigands = useRef<Record<string, Record<string, Record<string, VisibleObject>>>>({});
	const similarProteinLigands = useRef<Record<string, Record<string, Record<string, Record<string, VisibleObject>>>>>({});

	useImperativeHandle(ref, () => ({
		toggleQueryProteinLigand,
		toggleSimilarProteinLigand,
		toggleSimilarProteinStructure,
		hideAllSimilarProteinStructures
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
		struct: VisibleObject,
		key: string,
		ligandsQueryExpression: Expression,
		showRepresentationWhenCreated: boolean
	) {
		const l = await plugin.builders.structure.tryCreateComponentFromExpression(struct.object, ligandsQueryExpression, key);
		if (!l) {
			return null;
		} else {
			console.warn("Failed to create ligand representation for struct. Key: ", key);
		}

		await plugin.builders.structure.representation.addRepresentation(l, { type: "ball-and-stick" });
		setSubtreeVisibility(plugin.state.data, l.ref, !showRepresentationWhenCreated);

		return l;
	}

	async function createLigandsRepresentationForStructs(
		plugin: PluginContext,
		structs: Record<string, Record<string, Record<string, VisibleObject>>>,
		ligandsExpression: Record<string, Record<string, Record<string, Record<string, Expression>>>>,
		showRepresentationsWhenCreated: boolean
	) {
		const ls: Record<string, Record<string, Record<string, Record<string, VisibleObject>>>> = {};
		for (const [dataSourceName, result] of Object.entries(chainResult.dataSourceExecutorResults)) {
			if (!result.similarProteins) {
				continue;
			}

			for (const simProt of result.similarProteins) {
				if (simProt.bindingSites.length === 0) {
					if (!(dataSourceName in ls)) {
						ls[dataSourceName] = {};
					}
					if (!(simProt.pdbId in ls[dataSourceName])) {
						ls[dataSourceName][simProt.pdbId] = {};
					}
					if (!(simProt.chain in ls[dataSourceName][simProt.pdbId])) {
						ls[dataSourceName][simProt.pdbId][simProt.chain] = {};
					}
				}
				for (const bindingSite of simProt.bindingSites) {
					const struct = structs[dataSourceName][simProt.pdbId][simProt.chain];
					const key = `${dataSourceName}-${simProt.pdbId}-${simProt.chain}-${bindingSite.id}`;
					const ligandsOfOneType = ligandsExpression[dataSourceName][simProt.pdbId][simProt.chain][bindingSite.id];

					const l = await createLigandsRepresentationForStruct(plugin, struct, key, ligandsOfOneType, showRepresentationsWhenCreated);
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
						ls[dataSourceName][simProt.pdbId][simProt.chain][bindingSite.id] = { object: l, isVisible: false };
					} else {
						console.warn("Failed to create ligand representation. Key: ", key);
					}
				}
			}
		}
		similarProteinLigands.current = ls;
	}

	async function createStructureRepresentation(
		plugin: PluginContext,
		stateObjectRef: StateObjectRef<PSO.Molecule.Structure>,
		pivotExpression: Expression,
		restExpression: Expression,
		showRepresentationWhenCreated: boolean
	) {
		// Pivot
		const center = await plugin.builders.structure.tryCreateComponentFromExpression(stateObjectRef, pivotExpression, "pivot");
		if (center) {
			await plugin.builders.structure.representation.addRepresentation(center, { type: "cartoon", color: "model-index" });
			setSubtreeVisibility(plugin.state.data, center.ref, !showRepresentationWhenCreated);
		} else {
			console.warn("Failed to create structure representation.");
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

		return { object: structure, isVisible: false };
	}

	function setVisibility(visibleObject: VisibleObject, show: boolean) {
		const plugin = window.molstar;
		if (!plugin) {
			console.warn("Tried to set visibility, but the plugin is missing.");
			return;
		}

		setSubtreeVisibility(plugin.state.data, visibleObject.object.ref, !show);
		visibleObject.isVisible = show;
	}

	function performDynamicSuperposition(plugin: PluginContext, format: BuiltInTrajectoryFormat, chain: string) {
		return plugin.dataTransaction(async () => {
			// Load query protein structure
			const querySequenceUrl = getQuerySequenceUrl(chainResult);
			const queryStructureTmp = await _loadStructure(plugin, querySequenceUrl, format);
			queryStructure.current = queryStructureTmp;

			const queryProteinLigandsExpression: Record<string, Record<string, Record<string, Expression>>> = {};
			const dseResult = chainResult.dataSourceExecutorResults
			for (const [dataSourceName, result] of Object.entries(dseResult)) {
				for (const bindingSite of result.bindingSites) {
					const ligandLabel = bindingSite.id.substring(bindingSite.id.indexOf("_") + 1); // e.g. "H_SO4" -> "SO4"
					const ligandsOfOneType = MS.struct.generator.atomGroups({
						'residue-test': MS.core.logic.and([
							MS.core.rel.eq([
								MS.struct.atomProperty.macromolecular.auth_comp_id(), ligandLabel
							]),
							MS.core.rel.eq([
								MS.struct.atomProperty.macromolecular.auth_asym_id(), chain
							])
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
			const structuresTmp: Record<string, Record<string, Record<string, VisibleObject>>> = {};
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
			structures.current = structuresTmp;

			const similarProteinLigandsExpression: Record<string, Record<string, Record<string, Record<string, Expression>>>> = {};
			for (const [dataSourceName, result] of Object.entries(chainResult.dataSourceExecutorResults)) {
				if (!result.similarProteins) {
					continue;
				}

				for (const simProt of result.similarProteins) {
					if (simProt.bindingSites.length === 0) {
						if (!(dataSourceName in similarProteinLigandsExpression)) {
							similarProteinLigandsExpression[dataSourceName] = {};
						}
						if (!(simProt.pdbId in similarProteinLigandsExpression[dataSourceName])) {
							similarProteinLigandsExpression[dataSourceName][simProt.pdbId] = {};
						}
						if (!(simProt.chain in similarProteinLigandsExpression[dataSourceName][simProt.pdbId])) {
							similarProteinLigandsExpression[dataSourceName][simProt.pdbId][simProt.chain] = {};
						}
					}
					for (const bindingSite of simProt.bindingSites) {
						const ligandLabel = bindingSite.id.substring(bindingSite.id.indexOf("_") + 1); // e.g. "H_SO4" -> "SO4"
						const ligandsOfOneType = MS.struct.generator.atomGroups({
							'residue-test': MS.core.logic.and([
								MS.core.rel.eq([
									MS.struct.atomProperty.macromolecular.auth_comp_id(), ligandLabel
								]),
								MS.core.rel.eq([
									MS.struct.atomProperty.macromolecular.auth_asym_id(), chain
								])
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
			const queryProteinLigandsTmp: Record<string, Record<string, Record<string, VisibleObject>>> = {};
			for (const [dataSourceName, result] of Object.entries(dseResult)) {
				if (result.bindingSites.length === 0) {
					if (!(dataSourceName in queryProteinLigandsTmp)) {
						queryProteinLigandsTmp[dataSourceName] = {};
					}
					if (!(selectedChain in queryProteinLigandsTmp[dataSourceName])) {
						queryProteinLigandsTmp[dataSourceName][selectedChain] = {};
					}
				}
				for (const bindingSite of result.bindingSites) {
					const key = `${dataSourceName}-${selectedChain}-${bindingSite.id}`;
					const ligandOfOneTypeExpr = queryProteinLigandsExpression[dataSourceName][selectedChain][bindingSite.id];

					const l = await createLigandsRepresentationForStruct(plugin, queryStructureTmp, key, ligandOfOneTypeExpr, false);
					if (l) {
						if (!(dataSourceName in queryProteinLigandsTmp)) {
							queryProteinLigandsTmp[dataSourceName] = {};
						}
						if (!(selectedChain in queryProteinLigandsTmp[dataSourceName])) {
							queryProteinLigandsTmp[dataSourceName][selectedChain] = {};
						}
						queryProteinLigandsTmp[dataSourceName][selectedChain][bindingSite.id] = { object: l, isVisible: false };
					} else {
						console.warn("Failed to create ligand representation. Data: ", dataSourceName, selectedChain, bindingSite.id);
					}
				}
			}
			queryProteinLigands.current = queryProteinLigandsTmp;

			// Create representations of similar protein structures
			for (let i = 1; i < (selections?.length ?? 1); i++) {
				await transform(plugin, xs[i].cell, transforms[i - 1].bTransform);
				await createStructureRepresentation(plugin, xs[i].cell, pivot, rest, false);
			}

			// Create representations of similar protein ligands
			await createLigandsRepresentationForStructs(plugin, structuresTmp, similarProteinLigandsExpression, false);

			plugin.canvas3d?.requestCameraReset();
			plugin.managers.camera.reset()
		});
	}

	async function loadNewStructures(plugin: PluginUIContext, format: BuiltInTrajectoryFormat, chain: string) {
		onStructuresLoadingStart();
		await plugin.clear();
		await performDynamicSuperposition(plugin, format, chain);
		onStructuresLoadingEnd();
	}

	function toggleQueryProteinLigand(dataSourceName: string, chain: string, ligandId: string, show: boolean) {
		const ligand = queryProteinLigands.current[dataSourceName][chain][ligandId];
		if (!ligand) {
			console.warn(`Failed to toggle ligand... Data: `, dataSourceName, chain, ligandId, show);
			return;
		}

		setVisibility(ligand, show);
	}

	function toggleSimilarProteinLigand(dataSourceName: string, pdbCode: string, chain: string, ligandId: string, show: boolean) {
		const ligand = similarProteinLigands.current[dataSourceName][pdbCode][chain][ligandId];
		if (!ligand) {
			console.warn(`Failed to toggle ligand... Data: `, dataSourceName, pdbCode, chain, ligandId, show);
			return;
		}

		setVisibility(ligand, show);
	}

	function toggleSimilarProteinStructure(dataSourceName: string, pdbCode: string, chain: string, show: boolean) {
		const struct = structures.current[dataSourceName][pdbCode][chain];
		if (!struct) {
			console.warn(`Failed to toggle struct... Data: `, dataSourceName, pdbCode, chain, show);
			return;
		}

		setVisibility(struct, show);
		/* When protein structure is displayed, all ligands are as well, so we fix it by
		 * displaying only those that should be dispalyed and hiding those that should be hidden. */
		for (const ligand of Object.values(similarProteinLigands.current[dataSourceName][pdbCode][chain])) {
			setVisibility(ligand, ligand.isVisible);
		}

		// TODO maybe to other functions as well?
		window.molstar?.canvas3d?.requestCameraReset();
		window.molstar?.managers.camera.reset()
	}

	function hideAllSimilarProteinStructures() {
		for (const [dataSourceName, dataSourceRecord] of Object.entries(structures.current)) {
			for (const [pdbCode, proteinRecord] of Object.entries(dataSourceRecord)) {
				for (const [chain, structure] of Object.entries(proteinRecord)) {
					// Hide similar protein structure
					setVisibility(structure, false);

					// Hide also its ligands
					const similarProteinLigandsRecord = similarProteinLigands.current[dataSourceName][pdbCode][chain];
					for (const ligand of Object.values(similarProteinLigandsRecord)) {
						setVisibility(ligand, false);
					}
				}
			}
		}
	}
});
