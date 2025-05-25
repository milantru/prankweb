import { useEffect, createRef, forwardRef, useImperativeHandle, useRef, useState } from "react";
import { createPluginUI } from "molstar/lib/mol-plugin-ui";
import { renderReact18 } from "molstar/lib/mol-plugin-ui/react18";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
/*  Might require extra configuration,
see https://webpack.js.org/loaders/sass-loader/ for example.
create-react-app should support this natively. */
import "molstar/lib/mol-plugin-ui/skin/light.scss";
import { DefaultPluginUISpec } from "molstar/lib/mol-plugin-ui/spec";
import { ChainResult, ChainResults, ProcessedResult, Residue } from "../AnalyticalPage";
import { StateBuilder, StateObjectRef, StateObjectSelector } from "molstar/lib/mol-state";
import { Asset } from "molstar/lib/mol-util/assets";
import { MolScriptBuilder as MS } from "molstar/lib/mol-script/language/builder";
import { QueryContext, StructureElement, StructureSelection } from "molstar/lib/mol-model/structure";
import { compile } from "molstar/lib/mol-script/runtime/query/compiler";
import { alignAndSuperpose, superpose } from "molstar/lib/mol-model/structure/structure/util/superposition";
import { PluginContext } from "molstar/lib/mol-plugin/context";
import { PluginStateObject as PSO } from "molstar/lib/mol-plugin-state/objects";
import { Expression } from "molstar/lib/mol-script/language/expression";
import { Mat4 } from "molstar/lib/mol-math/linear-algebra";
import { StateTransforms } from "molstar/lib/mol-plugin-state/transforms";
import { BuiltInTrajectoryFormat } from "molstar/lib/mol-plugin-state/formats/trajectory";
import { MinimizeRmsd } from "molstar/lib/mol-math/linear-algebra/3d/minimize-rmsd";
import { setSubtreeVisibility } from 'molstar/lib/mol-plugin/behavior/static/state';
import { Color } from "molstar/lib/mol-util/color";
import { StructureOption } from "./SettingsPanel";
import Switch from "./Switch";

export type MolStarWrapperHandle = {
	toggleQueryProteinBindingSite: (dataSourceName: string, chain: string, bindingSiteId: string, show: boolean) => void;
	toggleSimilarProteinBindingSite: (dataSourceName: string, pdbCode: string, chain: string, bindingSiteId: string, show: boolean) => void;
	toggleSimilarProteinStructure: (dataSourceName: string, pdbCode: string, chain: string, show: boolean) => void;
	hideAllSimilarProteinStructures: (except: StructureOption[]) => void;
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

type ResidueObject = {
	residueComponentObject: StateObjectSelector;
	representationObject: StateObjectSelector;
	supportersCount: number;
};

type VisiblePocketObjects = {
	/* Like VisibleObject, but doesn't contain reference only to one object but to all residue objects that form pocket,
	 * and also apart from that, also contains information about how many data sources support that the residue 
	 * is part of the pocket/binding site. */
	residueObjectsAndSupporters: ResidueObject[];
	isVisible: boolean;
};

type Props = {
	chainResults: ChainResults;
	selectedChain: string;
	// bindingSiteSupportCounter[residue index in structure (of pocket)] -> number of data sources supporting that the residue index is part of binding site
	bindingSiteSupportCounter: Record<number, number>;
	dataSourceCount: number;
	onStructuresLoadingStart: () => void;
	onStructuresLoadingEnd: () => void;
};

export const MolStarWrapper = forwardRef(({
	chainResults,
	selectedChain,
	bindingSiteSupportCounter,
	dataSourceCount,
	onStructuresLoadingStart,
	onStructuresLoadingEnd
}: Props, ref) => {
	const chainResult = chainResults[selectedChain];
	if (!chainResult) {
		return <div>No data for the selected chain.</div>
	}
	const parent = createRef<HTMLDivElement>();
	const queryStructure = useRef<VisibleObject>(null!);
	const queryProteinPockets = useRef<Record<string, Record<string, Record<string, VisiblePocketObjects>>>>({});
	const queryProteinLigands = useRef<Record<string, Record<string, Record<string, VisibleObject>>>>({});
	const similarProteinStructures = useRef<Record<string, Record<string, Record<string, VisibleObject>>>>({});
	const similarProteinPockets = useRef<Record<string, Record<string, Record<string, Record<string, VisiblePocketObjects>>>>>({});
	const similarProteinLigands = useRef<Record<string, Record<string, Record<string, Record<string, VisibleObject>>>>>({});
	const [isHighlightModeOn, setIsHighlightModeOn] = useState<boolean>(false);
	const [structuresLoaded, setStructuresLoaded] = useState<boolean>(false);

	useImperativeHandle(ref, () => ({
		toggleQueryProteinBindingSite,
		toggleSimilarProteinBindingSite,
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
							showControls: false, // show advanced controls
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

	useEffect(() => {
		async function updatePocketsTransparency() {
			function updateTransparency(update: StateBuilder.Root, o: ResidueObject) {
				const alpha = getPocketTransparency(o.supportersCount)

				update.to(o.representationObject).update(old => {
					old.type.params.alpha = alpha;
				});
			}

			const plugin = window.molstar;
			if (!plugin) {
				console.error("Tried to update pockets transparency due to highlight mode toggle, but plugin is missing.");
				return;
			}

			const update = plugin.build();
			// Update query structure pockets
			for (const [dataSourceName, o1] of Object.entries(queryProteinPockets.current)) {
				for (const [chain, o2] of Object.entries(o1)) {
					for (const [bindingSiteId, pocket] of Object.entries(o2)) {
						for (const o of pocket.residueObjectsAndSupporters) {
							updateTransparency(update, o);
						}
					}
				}
			}
			// Update similar structures pockets
			for (const [dataSourceName, o1] of Object.entries(similarProteinPockets.current)) {
				for (const [pdbId, o2] of Object.entries(o1)) {
					for (const [chain, o3] of Object.entries(o2)) {
						for (const [bindingSiteId, pocket] of Object.entries(o3)) {
							for (const o of pocket.residueObjectsAndSupporters) {
								updateTransparency(update, o);
							}
						}
					}
				}
			}
			await update.commit();
		}

		if (structuresLoaded) {
			updatePocketsTransparency();
		}
	}, [isHighlightModeOn, structuresLoaded]);

	return (
		<div className="w-100">
			<div className="d-flex">
				<div className="mt-2 ml-auto"
					title="When the mode is enabled, the opacity of visualized binding sites increases with the number of supporting data sources.">
					Highlight mode
					<Switch classes="ml-2" onToggle={isOn => setIsHighlightModeOn(isOn)} />
				</div>
			</div>

			<div ref={parent} style={{ position: "relative", height: "70vh" }}></div>
		</div>
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

	function getPocketTransparency(supportersCount: number | null = null) {
		const defaultValue = 1; // No transparency

		if (!supportersCount) {
			return defaultValue;
		}

		const alpha = isHighlightModeOn
			? supportersCount / dataSourceCount
			: defaultValue;

		return alpha;
	}

	async function createPocketRepresentationForStruct(
		plugin: PluginContext,
		struct: VisibleObject,
		key: string,
		pocketExprAndSupportersCount: { expr: Expression, supportersCount: number },
		showRepresentationWhenCreated: boolean
	): Promise<ResidueObject | null> {
		const p = await plugin.builders.structure.tryCreateComponentFromExpression(struct.object, pocketExprAndSupportersCount.expr, key);
		if (!p) {
			console.warn("Failed to create pocket representation (for 1 residue) for struct. Key: ", key);
			return null;
		}

		const alpha = getPocketTransparency(pocketExprAndSupportersCount.supportersCount);

		const pr = await plugin.builders.structure.representation.addRepresentation(p, {
			type: "cartoon",
			typeParams: { alpha: alpha },
			color: "uniform",
			colorParams: { value: Color(Number("0xff0000")) }, // red color
			size: "physical",
			sizeParams: { scale: 1.10 }
		});
		setSubtreeVisibility(plugin.state.data, p.ref, !showRepresentationWhenCreated);

		const res: ResidueObject = {
			residueComponentObject: p,
			representationObject: pr,
			supportersCount: pocketExprAndSupportersCount.supportersCount
		};
		return res;
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
			console.warn("Failed to create ligand representation for struct. Key: ", key);
			return null;
		}

		await plugin.builders.structure.representation.addRepresentation(l, { type: "ball-and-stick" });
		setSubtreeVisibility(plugin.state.data, l.ref, !showRepresentationWhenCreated);

		return l;
	}

	async function createPocketsAndLigandsRepresentationForStructs(
		plugin: PluginContext,
		structs: Record<string, Record<string, Record<string, VisibleObject>>>,
		ligandsExpression: Record<string, Record<string, Record<string, Record<string, Expression>>>>,
		pocketsExpressions: Record<string, Record<string, Record<string, Record<string, { expr: Expression, supportersCount: number }[]>>>>,
		showRepresentationsWhenCreated: boolean
	) {
		const ls: Record<string, Record<string, Record<string, Record<string, VisibleObject>>>> = {};
		const ps: Record<string, Record<string, Record<string, Record<string, VisiblePocketObjects>>>> = {};
		for (const [dataSourceName, result] of Object.entries(chainResult.dataSourceExecutorResults)) {
			if (!result.similarProteins) {
				continue;
			}

			for (const simProt of result.similarProteins) {
				if (simProt.bindingSites.length === 0) {
					if (!(dataSourceName in ps)) {
						ps[dataSourceName] = {};
					}
					if (!(simProt.pdbId in ps[dataSourceName])) {
						ps[dataSourceName][simProt.pdbId] = {};
					}
					if (!(simProt.chain in ps[dataSourceName][simProt.pdbId])) {
						ps[dataSourceName][simProt.pdbId][simProt.chain] = {};
					}

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
					const pocketsExpressionsAndSupporters = pocketsExpressions[dataSourceName][simProt.pdbId][simProt.chain][bindingSite.id];

					const residueObjects: ResidueObject[] = [];
					for (let i = 0; i < pocketsExpressionsAndSupporters.length; i++) {
						const pocketExprAndSupporters = pocketsExpressionsAndSupporters[i];
						const key = `${dataSourceName}-${simProt.pdbId}-${simProt.chain}-${bindingSite.id}-pocket-${i}`;

						const resObj = await createPocketRepresentationForStruct(plugin, struct, key, pocketExprAndSupporters, showRepresentationsWhenCreated);
						if (!resObj) {
							console.warn("Failed to create pocket representation (for 1 residue). Key: ", key);
							continue;
						}
						residueObjects.push(resObj);
					}
					if (!(dataSourceName in ps)) {
						ps[dataSourceName] = {};
					}
					if (!(simProt.pdbId in ps[dataSourceName])) {
						ps[dataSourceName][simProt.pdbId] = {};
					}
					if (!(simProt.chain in ps[dataSourceName][simProt.pdbId])) {
						ps[dataSourceName][simProt.pdbId][simProt.chain] = {};
					}
					ps[dataSourceName][simProt.pdbId][simProt.chain][bindingSite.id] = { residueObjectsAndSupporters: residueObjects, isVisible: false };

					if (!bindingSite.id.startsWith("pocket_")) {
						// We know pocket also has ligand so we create expr for that too 
						const key = `${dataSourceName}-${simProt.pdbId}-${simProt.chain}-${bindingSite.id}-ligand`;
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
		}
		similarProteinPockets.current = ps;
		similarProteinLigands.current = ls;
	}

	async function createStructureRepresentation(
		plugin: PluginContext,
		stateObjectRef: StateObjectRef<PSO.Molecule.Structure>,
		thingsToDisplayExpression: Expression,
		showRepresentationWhenCreated: boolean
	) {
		const s = await plugin.builders.structure.tryCreateComponentFromExpression(stateObjectRef, thingsToDisplayExpression, "pivot");
		if (s) {
			await plugin.builders.structure.representation.addRepresentation(s, { type: "cartoon", color: "model-index" });
			setSubtreeVisibility(plugin.state.data, s.ref, !showRepresentationWhenCreated);
		} else {
			console.warn("Failed to create structure representation.");
		}
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

	function setVisibilityOfObject(visibleObject: VisibleObject, show: boolean) {
		const plugin = window.molstar;
		if (!plugin) {
			console.warn("Tried to set visibility, but the plugin is missing.");
			return;
		}

		setSubtreeVisibility(plugin.state.data, visibleObject.object.ref, !show);
		visibleObject.isVisible = show;
	}

	function setVisibilityOfObjects(visibleObjects: VisiblePocketObjects, show: boolean) {
		const plugin = window.molstar;
		if (!plugin) {
			console.warn("Tried to set visibility, but the plugin is missing.");
			return;
		}

		for (const o of visibleObjects.residueObjectsAndSupporters) {
			setSubtreeVisibility(plugin.state.data, o.residueComponentObject.ref, !show);
		}
		visibleObjects.isVisible = show;
	}

	function performDynamicSuperposition(plugin: PluginContext, format: BuiltInTrajectoryFormat, chain: string) {
		return plugin.dataTransaction(async () => {
			// Load query protein structure
			const querySequenceUrl = getQuerySequenceUrl(chainResult);
			const queryStructureTmp = await _loadStructure(plugin, querySequenceUrl, format);
			queryStructure.current = queryStructureTmp;

			const queryProteinPocketsExpression: Record<string, Record<string, Record<string, { expr: Expression, supportersCount: number }[]>>> = {};
			const queryProteinLigandsExpression: Record<string, Record<string, Record<string, Expression>>> = {};
			const dseResult = chainResult.dataSourceExecutorResults
			for (const [dataSourceName, result] of Object.entries(dseResult)) {
				for (const bindingSite of result.bindingSites) {
					const residues = bindingSite.residues.map(residue => residue.structureIndex);
					const residuesExpressionsAndSupporters = residues.map(r => ({
						expr: MS.struct.generator.atomGroups({
							'chain-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), chain]), // TODO: probably no need for chain test
							'residue-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.label_seq_id(), r])
						}),
						supportersCount: bindingSiteSupportCounter[r]
					}));
					// TODO netreba to ako v prankwebe v zdrojaku je?
					// const wholeResiduesExpression = MS.struct.generator.atomGroups({
					// 	'chain-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), chain]),
					// 	'residue-test': MS.core.logic.or(partsExpressions)
					// });

					if (!(dataSourceName in queryProteinPocketsExpression)) {
						queryProteinPocketsExpression[dataSourceName] = {};
					}
					if (!(selectedChain in queryProteinPocketsExpression[dataSourceName])) {
						queryProteinPocketsExpression[dataSourceName][selectedChain] = {};
					}
					if (!(bindingSite.id in queryProteinPocketsExpression[dataSourceName][selectedChain])) {
						queryProteinPocketsExpression[dataSourceName][selectedChain][bindingSite.id] = [];
					}
					queryProteinPocketsExpression[dataSourceName][selectedChain][bindingSite.id].push(...residuesExpressionsAndSupporters);

					if (!bindingSite.id.startsWith("pocket_")) {
						// We know pocket also has ligand so we create expr for that too 
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
			similarProteinStructures.current = structuresTmp;

			const similarProteinPocketsExpression: Record<string, Record<string, Record<string, Record<string, { expr: Expression, supportersCount: number }[]>>>> = {};
			const similarProteinLigandsExpression: Record<string, Record<string, Record<string, Record<string, Expression>>>> = {};
			for (const [dataSourceName, result] of Object.entries(chainResult.dataSourceExecutorResults)) {
				if (!result.similarProteins) {
					continue;
				}

				for (const simProt of result.similarProteins) {
					if (simProt.bindingSites.length === 0) {
						if (!(dataSourceName in similarProteinPocketsExpression)) {
							similarProteinPocketsExpression[dataSourceName] = {};
						}
						if (!(simProt.pdbId in similarProteinPocketsExpression[dataSourceName])) {
							similarProteinPocketsExpression[dataSourceName][simProt.pdbId] = {};
						}
						if (!(simProt.chain in similarProteinPocketsExpression[dataSourceName][simProt.pdbId])) {
							similarProteinPocketsExpression[dataSourceName][simProt.pdbId][simProt.chain] = {};
						}
					}
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
						const residues = bindingSite.residues.map(residue => residue.structureIndex);
						const residuesExpressionsAndSupporters = residues.map(r => ({
							expr: MS.struct.generator.atomGroups({
								'chain-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), simProt.chain]), // TODO: probably no need for chain test
								'residue-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.label_seq_id(), r])
							}),
							supportersCount: bindingSiteSupportCounter[r]
						}));
						// TODO netreba to ako v prankwebe v zdrojaku je?
						// const wholeResiduesExpression = MS.struct.generator.atomGroups({
						// 	'chain-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), chain]),
						// 	'residue-test': MS.core.logic.or(partsExpressions)
						// });

						if (!(dataSourceName in similarProteinPocketsExpression)) {
							similarProteinPocketsExpression[dataSourceName] = {};
						}
						if (!(simProt.pdbId in similarProteinPocketsExpression[dataSourceName])) {
							similarProteinPocketsExpression[dataSourceName][simProt.pdbId] = {};
						}
						if (!(simProt.chain in similarProteinPocketsExpression[dataSourceName][simProt.pdbId])) {
							similarProteinPocketsExpression[dataSourceName][simProt.pdbId][simProt.chain] = {};
						}
						if (!(bindingSite.id in similarProteinPocketsExpression[dataSourceName][simProt.pdbId][simProt.chain])) {
							similarProteinPocketsExpression[dataSourceName][simProt.pdbId][simProt.chain][bindingSite.id] = [];
						}
						similarProteinPocketsExpression[dataSourceName][simProt.pdbId][simProt.chain][bindingSite.id].push(...residuesExpressionsAndSupporters);

						if (!bindingSite.id.startsWith("pocket_")) {
							// We know pocket also has ligand so we create expr for that too 
							const ligandLabel = bindingSite.id.substring(bindingSite.id.indexOf("_") + 1); // e.g. "H_SO4" -> "SO4"
							const ligandsOfOneType = MS.struct.generator.atomGroups({
								'residue-test': MS.core.logic.and([
									MS.core.rel.eq([
										MS.struct.atomProperty.macromolecular.auth_comp_id(), ligandLabel
									]),
									MS.core.rel.eq([
										MS.struct.atomProperty.macromolecular.auth_asym_id(), simProt.chain
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
			}

			const xs = plugin.managers.structure.hierarchy.current.structures;
			if (xs.length === 0) {
				console.warn("No structures to display.");
				return;
			}

			const similarProteinsChains: string[] = [];
			for (const [dataSourceName, result] of Object.entries(chainResult.dataSourceExecutorResults)) {
				if (!result.similarProteins) {
					continue;
				}

				for (const simProt of result.similarProteins) {
					similarProteinsChains.push(simProt.chain);
				}
			}

			const createGetChainExpression = (c: string) => {
				const selectChainExpr = MS.struct.generator.atomGroups({
					'chain-test': MS.core.rel.eq([
						MS.struct.atomProperty.macromolecular.auth_asym_id(), c
					]),
				});

				return selectChainExpr;
			};

			const query1 = compile<StructureSelection>(createGetChainExpression(chain));
			let selections: StructureElement.Loci[] = [
				StructureSelection.toLociWithCurrentUnits(query1(new QueryContext(xs[0].cell.obj!.data)))
			];
			for (let i = 1; i < xs.length; i++) {
				const similarProteinChain = similarProteinsChains[i - 1];
				const query2 = compile<StructureSelection>(createGetChainExpression(similarProteinChain));
				const selection = StructureSelection.toLociWithCurrentUnits(query2(new QueryContext(xs[i].cell.obj!.data)));
				selections.push(selection);
			}

			let transforms: MinimizeRmsd.Result[] | null = null;
			if (xs.length > 1) { // At least 1 similar protein structure selected (not only query protein is being visualised)
				transforms = alignAndSuperpose(selections);
			}

			// Create representation of query protein structure
			await createStructureRepresentation(plugin, xs[0].cell, createGetChainExpression(chain), true);

			// Create representations of query protein ligands
			const queryProteinPocketsTmp: Record<string, Record<string, Record<string, VisiblePocketObjects>>> = {};
			const queryProteinLigandsTmp: Record<string, Record<string, Record<string, VisibleObject>>> = {};
			for (const [dataSourceName, result] of Object.entries(dseResult)) {
				if (result.bindingSites.length === 0) {
					if (!(dataSourceName in queryProteinPocketsTmp)) {
						queryProteinPocketsTmp[dataSourceName] = {};
					}
					if (!(selectedChain in queryProteinPocketsTmp[dataSourceName])) {
						queryProteinPocketsTmp[dataSourceName][selectedChain] = {};
					}

					if (!(dataSourceName in queryProteinLigandsTmp)) {
						queryProteinLigandsTmp[dataSourceName] = {};
					}
					if (!(selectedChain in queryProteinLigandsTmp[dataSourceName])) {
						queryProteinLigandsTmp[dataSourceName][selectedChain] = {};
					}
				}
				for (const bindingSite of result.bindingSites) {
					const pocketExpressionsAndSupporters = queryProteinPocketsExpression[dataSourceName][selectedChain][bindingSite.id];

					const residueObjects: ResidueObject[] = [];
					for (let i = 0; i < pocketExpressionsAndSupporters.length; i++) {
						const pocketExprAndSupportersCount = pocketExpressionsAndSupporters[i];
						const key = `${dataSourceName}-${selectedChain}-${bindingSite.id}-pocket-${i}`;

						const resObj = await createPocketRepresentationForStruct(plugin, queryStructureTmp, key, pocketExprAndSupportersCount, false);
						if (!resObj) {
							console.warn("Failed to create pocket representation (for 1 residue). Key: ", key);
							continue;
						}
						residueObjects.push(resObj);
					}
					if (!(dataSourceName in queryProteinPocketsTmp)) {
						queryProteinPocketsTmp[dataSourceName] = {};
					}
					if (!(selectedChain in queryProteinPocketsTmp[dataSourceName])) {
						queryProteinPocketsTmp[dataSourceName][selectedChain] = {};
					}
					queryProteinPocketsTmp[dataSourceName][selectedChain][bindingSite.id] = { residueObjectsAndSupporters: residueObjects, isVisible: false };

					if (!bindingSite.id.startsWith("pocket_")) {
						const key = `${dataSourceName}-${selectedChain}-${bindingSite.id}-ligand`;
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
			}
			queryProteinPockets.current = queryProteinPocketsTmp;
			queryProteinLigands.current = queryProteinLigandsTmp;

			// Create representations of similar protein structures
			for (let i = 1; i < (selections?.length ?? 1); i++) {
				await transform(plugin, xs[i].cell, transforms[i - 1].bTransform);
				await createStructureRepresentation(plugin, xs[i].cell, createGetChainExpression(similarProteinsChains[i - 1]), false);
			}

			// Create representations of similar protein ligands
			await createPocketsAndLigandsRepresentationForStructs(plugin, structuresTmp, similarProteinLigandsExpression, similarProteinPocketsExpression, false);

			// Reset camera (this should make the structures more visible)
			plugin.canvas3d?.requestCameraReset();
			plugin.managers.camera.reset()
		});
	}

	async function loadNewStructures(plugin: PluginUIContext, format: BuiltInTrajectoryFormat, chain: string) {
		setStructuresLoaded(false);
		onStructuresLoadingStart();
		await plugin.clear();
		await performDynamicSuperposition(plugin, format, chain);
		onStructuresLoadingEnd();
		setStructuresLoaded(true);
	}

	/** Toggles visibility of a pocket. If pocket contains ligand, shows/hides it as well. */
	function toggleQueryProteinBindingSite(dataSourceName: string, chain: string, bindingSiteId: string, show: boolean) {
		const pocket = queryProteinPockets.current[dataSourceName][chain][bindingSiteId]
		setVisibilityOfObjects(pocket, show);

		if (bindingSiteId.startsWith("pocket_")) {
			return;
		}
		// We know ligand exists in the pocket so we show/hide it as well
		const ligand = queryProteinLigands.current[dataSourceName][chain][bindingSiteId];
		setVisibilityOfObject(ligand, show);
	}

	/** Toggles visibility of a pocket. If pocket contains ligand, shows/hides it as well. */
	function toggleSimilarProteinBindingSite(dataSourceName: string, pdbCode: string, chain: string, bindingSiteId: string, show: boolean) {
		const pocket = similarProteinPockets.current[dataSourceName][pdbCode][chain][bindingSiteId];
		setVisibilityOfObjects(pocket, show);

		if (bindingSiteId.startsWith("pocket_")) {
			return;
		}
		// We know ligand exists in the pocket so we show/hide it as well
		const ligand = similarProteinLigands.current[dataSourceName][pdbCode][chain][bindingSiteId];
		setVisibilityOfObject(ligand, show);
	}

	function toggleSimilarProteinStructure(dataSourceName: string, pdbCode: string, chain: string, show: boolean) {
		const struct = similarProteinStructures.current[dataSourceName][pdbCode][chain];
		if (!struct) {
			console.warn(`Failed to toggle struct... Data: `, dataSourceName, pdbCode, chain, show);
			return;
		}

		setVisibilityOfObject(struct, show);
		/* When protein structure is displayed, all pockets and ligands are as well, so we fix it by
		 * displaying only those that should be dispalyed and hiding those that should be hidden. */
		for (const pocket of Object.values(similarProteinPockets.current[dataSourceName][pdbCode][chain])) {
			setVisibilityOfObjects(pocket, pocket.isVisible);
		}
		for (const ligand of Object.values(similarProteinLigands.current[dataSourceName][pdbCode][chain])) {
			setVisibilityOfObject(ligand, ligand.isVisible);
		}

		// TODO maybe to other functions as well?
		// Reset camera (this should make the structures more visible)
		window.molstar?.canvas3d?.requestCameraReset();
		window.molstar?.managers.camera.reset()
	}

	/** Hides all similar protein structures except those specified in the argument `except`. */
	function hideAllSimilarProteinStructures(except: StructureOption[]) {
		for (const [dataSourceName, dataSourceRecord] of Object.entries(similarProteinStructures.current)) {
			for (const [pdbCode, proteinRecord] of Object.entries(dataSourceRecord)) {
				for (const [chain, structure] of Object.entries(proteinRecord)) {
					const isException = except.some(x => x.value.dataSourceName === dataSourceName
						&& x.value.pdbId === pdbCode
						&& x.value.chain === chain);
					if (isException) {
						continue;
					}
					// Hide similar protein structure
					setVisibilityOfObject(structure, false);

					// Hide also its pockets
					const similarProteinPocketsRecord = similarProteinPockets.current[dataSourceName][pdbCode][chain];
					for (const pocket of Object.values(similarProteinPocketsRecord)) {
						setVisibilityOfObjects(pocket, false);
					}

					// Hide also its ligands
					const similarProteinLigandsRecord = similarProteinLigands.current[dataSourceName][pdbCode][chain];
					for (const ligand of Object.values(similarProteinLigandsRecord)) {
						setVisibilityOfObject(ligand, false);
					}
				}
			}
		}
	}
});
