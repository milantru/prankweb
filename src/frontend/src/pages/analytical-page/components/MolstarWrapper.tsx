import { useEffect, createRef, forwardRef, useImperativeHandle, useRef, useState } from "react";
import { createPluginUI } from "molstar/lib/mol-plugin-ui";
import { renderReact18 } from "molstar/lib/mol-plugin-ui/react18";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
/*  Might require extra configuration,
see https://webpack.js.org/loaders/sass-loader/ for example.
create-react-app should support this natively. */
import "molstar/lib/mol-plugin-ui/skin/light.scss";
import { DefaultPluginUISpec } from "molstar/lib/mol-plugin-ui/spec";
import { ChainResult, ProcessedResult, SimilarProtein } from "../AnalyticalPage";
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
import { Script } from "molstar/lib/mol-script/script";
import { useInterval } from "../../../shared/hooks/useInterval";
import { sleep } from "../../../shared/helperFunctions/sleep";
import { toastWarning } from "../../../shared/helperFunctions/toasts";

export type MolStarWrapperHandle = {
	toggleQueryProteinBindingSite: (dataSourceName: string, chain: string, bindingSiteId: string, show: boolean) => void;
	toggleSimilarProteinBindingSite: (dataSourceName: string, pdbCode: string, chain: string, bindingSiteId: string, show: boolean) => void;
	toggleSimilarProteinStructure: (dataSourceName: string, pdbCode: string, chain: string, show: boolean) => void;
	hideAllSimilarProteinStructures: (except: StructureOption[]) => void;
	highlight: (structureIndices: number[], dataSourceName?: string, pdbCode?: string, chain?: string) => void;
	focus: (structureIndices: number[], dataSourceName?: string, pdbCode?: string, chain?: string) => void;
	getMolstarPlugin: () => PluginUIContext;
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
	chainResult: ChainResult;
	selectedChain: string;
	selectedStructures: StructureOption[];
	// bindingSiteSupportCounter[residue index in structure (of pocket)] -> number of data sources supporting that the residue index is part of binding site
	bindingSiteSupportCounter: Record<number, number>;
	dataSourceCount: number;
	// queryProteinBindingSitesData[dataSourceName][chain][bindingSiteId] -> true/false to show bindings site (and ligands if available) 
	queryProteinBindingSitesData: Record<string, Record<string, Record<string, boolean>>>;
	// similarProteinBindingSitesData[dataSourceName][pdbCode][chain][bindingSiteId] -> true/false to show bindings site (and ligands if available) 
	similarProteinBindingSitesData: Record<string, Record<string, Record<string, Record<string, boolean>>>>;
	onStructuresLoadingStart: () => void;
	onStructuresLoadingEnd: () => void;
	onAlignAndSuperposeError: () => void;
};

export const MolStarWrapper = forwardRef(({
	chainResult,
	selectedChain,
	selectedStructures,
	bindingSiteSupportCounter,
	dataSourceCount,
	queryProteinBindingSitesData,
	similarProteinBindingSitesData,
	onStructuresLoadingStart,
	onStructuresLoadingEnd,
	onAlignAndSuperposeError
}: Props, ref) => {
	const parent = createRef<HTMLDivElement>();

	const queryStructure = useRef<VisibleObject | null>(null);
	// queryProteinPockets[dataSourceName][chain][bindingSiteId]
	const queryProteinPockets = useRef<Record<string, Record<string, Record<string, VisiblePocketObjects>>>>({});
	// queryProteinLigands[dataSourceName][chain][bindingSiteId]
	const queryProteinLigands = useRef<Record<string, Record<string, Record<string, VisibleObject>>>>({});

	// similarProteinStructures[dataSourceName][pdbCode][chain]
	const similarProteinStructures = useRef<Record<string, Record<string, Record<string, VisibleObject>>>>({});
	// similarProteinPockets[dataSourceName][pdbCode][chain][bindingSiteId]
	const similarProteinPockets = useRef<Record<string, Record<string, Record<string, Record<string, VisiblePocketObjects>>>>>({});
	// similarProteinLigands[dataSourceName][pdbCode][chain][bindingSiteId]
	const similarProteinLigands = useRef<Record<string, Record<string, Record<string, Record<string, VisibleObject>>>>>({});

	const [isHighlightModeOn, setIsHighlightModeOn] = useState<boolean>(false);
	const [isHighlightModeSwitchingDisabled, setIsHighlightModeSwitchingDisabled] = useState<boolean>(false);
	const [structuresLoaded, setStructuresLoaded] = useState<boolean>(false);
	const [binidingSitesRemainingCount, setBindingSitesRemainingCount] = useState<number>(0);
	const [bindingSitesCount, setBindingSitesCount] = useState<number>(0);
	const loadingMessage = useRef<string>("Downloading structure(s)...");
	const [displayedLoadingMessageLength, setDisplayedLoadingMessageLength] = useState<number>(loadingMessage.current.length);
	const [downloadingStructures, setDownloadingStructures] = useState<boolean>(false);
	const [similarStructuresRemainingCount, setSimilarStructuresRemainingCount] = useState<number>(0);

	const alignAndSuperposeFailed = useRef<boolean>(false);

	useImperativeHandle(ref, () => ({
		toggleQueryProteinBindingSite,
		toggleSimilarProteinBindingSite,
		toggleSimilarProteinStructure,
		hideAllSimilarProteinStructures,
		highlight,
		focus,
		getMolstarPlugin
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
								// Tree with some components, hide for small and medium screens
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

			loadNewStructures(plugin, "pdb", selectedChain, selectedStructures);
		}

		init();

		return () => {
			window.molstar?.dispose();
			window.molstar = undefined;
		};
	}, []);

	useEffect(() => {
		async function loadNewStructuresWrapper(plugin: PluginUIContext) {
			await loadNewStructures(plugin, "pdb", selectedChain, selectedStructures);
			if (alignAndSuperposeFailed.current) {
				alignAndSuperposeFailed.current = false;
				/* Try again... It should not fail this time as alignAndSuperpose will not be called because
				 * we pass no options (selected structures), only query struct should be visualised. */
				await loadNewStructures(plugin, "pdb", selectedChain, []);
				toastWarning("One or more selected proteins could not be aligned or superposed due to an error. \
						As a result, only the query protein is displayed in the structural visualization. \
						Please modify your selection and try again.");
				onAlignAndSuperposeError();
			}
		}

		const plugin: PluginUIContext = window.molstar;
		if (!plugin) {
			return;
		}

		loadNewStructuresWrapper(plugin);
	}, [/*chainResult, */selectedStructures, selectedChain]); // TODO is not dependant on chainResult because query seq should not change

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
				console.error("Tried to update pockets transparency due to Support-Based Highlighting toggle, but plugin is missing.");
				return;
			}

			const update = plugin.build();
			let transparencyError = false;
			// Update query structure pockets
			for (const [dataSourceName, o1] of Object.entries(queryProteinPockets.current)) {
				for (const [chain, o2] of Object.entries(o1)) {
					for (const [bindingSiteId, pocket] of Object.entries(o2)) {
						for (const o of pocket.residueObjectsAndSupporters) {
							try{
								updateTransparency(update, o);
							}
							catch (e) { transparencyError = true; }
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
								try{
									updateTransparency(update, o);
								}
								catch (e) { transparencyError = true; }
								}
						}
					}
				}
			}
			if (transparencyError) {
				console.error("Failed to update pockets transparency.");
			}
			await update.commit();
			// await sleep(250); // TODO uncomment if required
			setIsHighlightModeSwitchingDisabled(false);
		}

		if (structuresLoaded) {
			updatePocketsTransparency();
		}
	}, [isHighlightModeOn, structuresLoaded]);

	useEffect(() => {
		if (structuresLoaded) { // After loading, always reset length so next time full message will be displayed
			setDisplayedLoadingMessageLength(loadingMessage.current.length);
		}
	}, [structuresLoaded]);

	useInterval(() => {
		// It is desired to display "Loading structures...", then "Loading structures.", and then "Loading structures.." (and loop it)
		setDisplayedLoadingMessageLength(prevLen => {
			if ((prevLen + 1) > loadingMessage.current.length) {
				return loadingMessage.current.length - 3;
			}
			return prevLen + 1;
		});
	}, structuresLoaded ? null : 500);

	return (
		<div className="w-100">
			<div className="d-flex">
				{
					downloadingStructures 
					? (
						<>
							{/* When loading msg animation ("Loading structures.", "Loading structures..", "Loading structures...",...)
							* is on and the screen is small, the animation moves "Support-Based Highlighting" and Switch with each tick, 
							* which doesn't look nice. Max width 200px solves this problem. */}
							<div className="d-flex align-items-center" style={{ minWidth: "200px" }}>
								{loadingMessage.current.substring(0, displayedLoadingMessageLength)}
							</div>
						</>
					)
					: <></>
				}
				<div className="d-flex flex-column" style={{ minWidth: "200px" }}>
					{similarStructuresRemainingCount > 0 && binidingSitesRemainingCount > 0 ? (
						<>
						<div className="mb-1">
							Loading {similarStructuresRemainingCount > 0 ? `${similarStructuresRemainingCount} structure${similarStructuresRemainingCount > 1 ? "s" : ""}` : ""}
							{similarStructuresRemainingCount > 0 && bindingSitesCount > 0 ? " and " : ""}
							{binidingSitesRemainingCount > 0 && bindingSitesCount > 0
							? `${bindingSitesCount - binidingSitesRemainingCount} of ${bindingSitesCount} binding sites`
							: ""}
							.
						</div>

						{bindingSitesCount > 0 && (
							<progress
							value={bindingSitesCount - binidingSitesRemainingCount}
							max={bindingSitesCount}
							style={{ width: "100%", height: "12px" }}
							/>
						)}
						</>
					) : (
						""
					)}
				</div>

				<div className="mt-2 ml-auto"
					title="When the mode is enabled, the opacity of residues of visualized binding sites increases with the number of supporting data sources.">
					<Switch classes="ml-2" isDisabled={isHighlightModeSwitchingDisabled || !structuresLoaded} onToggle={handleSwitchToggle} />
				</div>
			</div>

			<div ref={parent} style={{ position: "relative", height: "70vh" }}></div>
		</div>
	);

	function getMolstarPlugin(): PluginUIContext | null {
		const plugin: PluginUIContext = window.molstar;
		if (!plugin) {
			return null;
		}

		return plugin;
	}

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

	async function handleSwitchToggle(isOn: boolean) {
		if (isHighlightModeSwitchingDisabled) {
			return;
		}
		/* Disable Support-Based Highlighting switching until transparency of residues is updated, 
		 * after that the switching will be enabled again. */
		setIsHighlightModeSwitchingDisabled(true);
		setIsHighlightModeOn(isOn);
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
			type: "gaussian-surface",
			typeParams: { alpha: alpha },
			color: "uniform",
			colorParams: { value: Color(Number("0xff0000")) }, // red color
			size: "physical",
			sizeParams: { scale: 0.5 }
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
		options: StructureOption[]
	) {
		const ls: Record<string, Record<string, Record<string, Record<string, VisibleObject>>>> = {};
		const ps: Record<string, Record<string, Record<string, Record<string, VisiblePocketObjects>>>> = {};
		for (const [dataSourceName, result] of Object.entries(chainResult.dataSourceExecutorResults)) {
			if (!result.similarProteins) {
				continue;
			}

			for (const simProt of result.similarProteins) {
				if (!isSimProtInOptions(dataSourceName, simProt, options)) {
					continue;
				}

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
						const show = similarProteinBindingSitesData[dataSourceName][simProt.pdbId][simProt.chain][bindingSite.id];

						const resObj = await createPocketRepresentationForStruct(plugin, struct, key, pocketExprAndSupporters, show);
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

					if (!bindingSite.id.startsWith("pocket")) {
						// We know pocket also has ligand so we create expr for that too 
						const key = `${dataSourceName}-${simProt.pdbId}-${simProt.chain}-${bindingSite.id}-ligand`;
						const ligandsOfOneType = ligandsExpression[dataSourceName][simProt.pdbId][simProt.chain][bindingSite.id];
						const show = similarProteinBindingSitesData[dataSourceName][simProt.pdbId][simProt.chain][bindingSite.id];

						const l = await createLigandsRepresentationForStruct(plugin, struct, key, ligandsOfOneType, show);
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
					setBindingSitesRemainingCount(prev => prev - 1);
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

	async function _loadStructure(plugin: PluginContext, structureUrl: string, format: BuiltInTrajectoryFormat): Promise<VisibleObject> {
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

	function isSimProtInOptions(dataSourceName, simProt: SimilarProtein, options: StructureOption[]) {
		const inOptions = options.some(o => o.value.dataSourceName === dataSourceName
			&& o.value.pdbId === simProt.pdbId
			&& o.value.chain === simProt.chain);
		return inOptions;
	}

	function performDynamicSuperposition(plugin: PluginContext, format: BuiltInTrajectoryFormat, chain: string, options: StructureOption[]) {
		return plugin.dataTransaction(async () => {
			// Load query protein structure
			const querySequenceUrl = getQuerySequenceUrl(chainResult);
			setDownloadingStructures(true);
			const queryStructureTmp = await _loadStructure(plugin, querySequenceUrl, format);
			queryStructure.current = queryStructureTmp;

			// Load query protein bindings sites/pockets (and also ligands if available)
			const queryProteinPocketsExpression: Record<string, Record<string, Record<string, { expr: Expression, supportersCount: number }[]>>> = {};
			const queryProteinLigandsExpression: Record<string, Record<string, Record<string, Expression>>> = {};
			const dseResult = chainResult.dataSourceExecutorResults
			let bindingSitesCount = 0;
			let similarStructuresCount = 1; // 1 for query protein structure
			for (const [dataSourceName, result] of Object.entries(dseResult)) {
				for (const bindingSite of result.bindingSites) {
					bindingSitesCount++;
					const residues = bindingSite.residues.map(residue => residue.structureIndex);
					const residuesExpressionsAndSupporters = residues.map(r => ({
						expr: MS.struct.modifier.wholeResidues({
							0: MS.struct.generator.atomGroups({
								'chain-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), chain]),
								'residue-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.label_seq_id(), r])
							})
						}),
						supportersCount: bindingSiteSupportCounter[r]
					}));

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

					if (!bindingSite.id.startsWith("pocket")) {
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
					if (!isSimProtInOptions(dataSourceName, simProt, options)) {
						continue;
					}
					similarStructuresCount++;

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
			setDownloadingStructures(false);
			similarProteinStructures.current = structuresTmp;

			// Load similar proteins binding sites/pockets (and also ligands if available) 
			const similarProteinPocketsExpression: Record<string, Record<string, Record<string, Record<string, { expr: Expression, supportersCount: number }[]>>>> = {};
			const similarProteinLigandsExpression: Record<string, Record<string, Record<string, Record<string, Expression>>>> = {};
			for (const [dataSourceName, result] of Object.entries(chainResult.dataSourceExecutorResults)) {
				if (!result.similarProteins) {
					continue;
				}

				for (const simProt of result.similarProteins) {
					if (!isSimProtInOptions(dataSourceName, simProt, options)) {
						continue;
					}

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
						bindingSitesCount++;
						const residues = bindingSite.residues.map(residue => residue.structureIndex);
						const residuesExpressionsAndSupporters = residues.map(r => ({
							expr: MS.struct.modifier.wholeResidues({
								0: MS.struct.generator.atomGroups({
									'chain-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), simProt.chain]),
									'residue-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.label_seq_id(), r])
								})
							}),
							supportersCount: bindingSiteSupportCounter[r]
						}));

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

						if (!bindingSite.id.startsWith("pocket")) {
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

			setBindingSitesCount(bindingSitesCount);
			setBindingSitesRemainingCount(bindingSitesCount);
			setSimilarStructuresRemainingCount(similarStructuresCount);

			const xs = plugin.managers.structure.hierarchy.current.structures;
			if (xs.length === 0) {
				// This should never happen, always at least query struct is displayed
				console.error("No structures to display.");
				return;
			}

			const similarProteinsChains: string[] = [];
			for (const [dataSourceName, result] of Object.entries(chainResult.dataSourceExecutorResults)) {
				if (!result.similarProteins) {
					continue;
				}

				for (const simProt of result.similarProteins) {
					if (!isSimProtInOptions(dataSourceName, simProt, options)) {
						continue;
					}

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
				try {
					transforms = alignAndSuperpose(selections);
				} catch {
					/* Mol* may fail to align and superpose structures (probably due to unknown residues,
					 * more here: https://www.rcsb.org/ligand/UNK). We have encountered this problem when
					 * 155C was query protein and selected similar protein was 1COT, 
					 * more here: https://github.com/milantru/prankweb/issues/78. */
					alignAndSuperposeFailed.current = true;
					return;
				}
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
						const show = queryProteinBindingSitesData[dataSourceName][selectedChain][bindingSite.id];

						const resObj = await createPocketRepresentationForStruct(plugin, queryStructureTmp, key, pocketExprAndSupportersCount, show);
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

					if (!bindingSite.id.startsWith("pocket")) {
						const key = `${dataSourceName}-${selectedChain}-${bindingSite.id}-ligand`;
						const ligandOfOneTypeExpr = queryProteinLigandsExpression[dataSourceName][selectedChain][bindingSite.id];
						const show = queryProteinBindingSitesData[dataSourceName][selectedChain][bindingSite.id];

						const l = await createLigandsRepresentationForStruct(plugin, queryStructureTmp, key, ligandOfOneTypeExpr, show);
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
					setBindingSitesRemainingCount(prevCount => prevCount - 1);
				}
			}
			queryProteinPockets.current = queryProteinPocketsTmp;
			queryProteinLigands.current = queryProteinLigandsTmp;
			// Create representations of similar protein structures
			for (let i = 1; i < (selections?.length ?? 1); i++) {
				await transform(plugin, xs[i].cell, transforms[i - 1].bTransform);
				await createStructureRepresentation(plugin, xs[i].cell, createGetChainExpression(similarProteinsChains[i - 1]), true);
				setSimilarStructuresRemainingCount(prevCount => prevCount - 1);
			}

			// Create representations of similar protein ligands
			await createPocketsAndLigandsRepresentationForStructs(
				plugin, structuresTmp, similarProteinLigandsExpression, similarProteinPocketsExpression, options);

			// Reset camera (this should make the structures more visible)
			plugin.canvas3d?.requestCameraReset();
			plugin.managers.camera.reset()
		});
	}

	async function loadNewStructures(plugin: PluginUIContext, format: BuiltInTrajectoryFormat, chain: string, options: StructureOption[]) {
		setStructuresLoaded(false);
		onStructuresLoadingStart();
		await plugin.clear();
		await performDynamicSuperposition(plugin, format, chain, options);
		onStructuresLoadingEnd();
		setStructuresLoaded(true);
	}

	/** Toggles visibility of a pocket. If pocket contains ligand, shows/hides it as well. */
	function toggleQueryProteinBindingSite(dataSourceName: string, chain: string, bindingSiteId: string, show: boolean) {
		const pocket = queryProteinPockets.current[dataSourceName][chain][bindingSiteId]
		setVisibilityOfObjects(pocket, show);

		if (bindingSiteId.startsWith("pocket")) {
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

		if (bindingSiteId.startsWith("pocket")) {
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

	/**
	 * Method which gets selection from specified chainId and residues.
	 * @param struct Mol* Structure object
	 * @param chainId Chain (letter) to be focused on
	 * @param positions Residue ids
	 * @returns StructureSelection of the desired residues
	 */
	function getSelectionFromChainAuthId(struct: StateObjectSelector, chainId: string, positions: number[]) {
		const query = MS.struct.generator.atomGroups({
			'chain-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), chainId]),
			'residue-test': MS.core.set.has([MS.set(...positions), MS.struct.atomProperty.macromolecular.auth_seq_id()]),
			'group-by': MS.struct.atomProperty.macromolecular.residueKey()
		});
		return Script.getStructureSelection(query, struct.cell.obj!.data);
	}

	// TODO maybe update docstring?
	/**
	 * Method which focuses on the specified residues loci.
	 * @param structureIndex Residue id in structure viewer
	 * @returns void
	*/
	function highlight(structureIndices: number[], dataSourceName?: string, pdbCode?: string, chain?: string) {
		if (dataSourceName && pdbCode && chain) {
			highlightInSimilarProteinStruct(structureIndices, dataSourceName, pdbCode, chain);
		} else {
			highlightInQueryProteinStruct(structureIndices);
		}
	}

	function highlightInQueryProteinStruct(structureIndices: number[]) {
		const plugin = window.molstar;
		if (!plugin) {
			console.warn("Tried to highlight item in Mol* viewer, but the plugin is missing.");
			return;
		}

		if (!queryStructure.current) {
			return;
		}

		const sel = getSelectionFromChainAuthId(queryStructure.current.object, selectedChain, structureIndices);
		const loci = StructureSelection.toLociWithSourceUnits(sel);
		plugin.managers.interactivity.lociHighlights.highlightOnly({ loci });
	}

	function highlightInSimilarProteinStruct(structureIndices: number[], dataSourceName: string, pdbCode: string, chain: string) {
		const plugin = window.molstar;
		if (!plugin) {
			console.warn("Tried to highlight item in Mol* viewer, but the plugin is missing.");
			return;
		}

		// TODO maybe some check if keys exist? if not console error and return?
		const simStruct = similarProteinStructures.current[dataSourceName][pdbCode][chain];

		const sel = getSelectionFromChainAuthId(simStruct.object, chain, structureIndices);
		const loci = StructureSelection.toLociWithSourceUnits(sel);
		plugin.managers.interactivity.lociHighlights.highlightOnly({ loci });
	}

	// TODO maybe update docstring?
	/**
	 * Method which focuses on the specified loci.
	 * @param structureIndex Residue id in structure viewer
	 * @returns void
	 */
	function focus(structureIndices: number[], dataSourceName?: string, pdbCode?: string, chain?: string) {
		if (dataSourceName && pdbCode && chain) {
			focusInSimilarProteinStruct(structureIndices, dataSourceName, pdbCode, chain);
		} else {
			focusInQueryProteinStruct(structureIndices);
		}
	}

	function focusInQueryProteinStruct(structureIndices: number[]) {
		const plugin = window.molstar;
		if (!plugin) {
			console.warn("Tried to focus on item in Mol* viewer, but the plugin is missing.");
			return;
		}

		if (!queryStructure.current) {
			return;
		}

		const sel = getSelectionFromChainAuthId(queryStructure.current.object, selectedChain, structureIndices);
		const loci = StructureSelection.toLociWithSourceUnits(sel);
		plugin.managers.interactivity.lociHighlights.highlightOnly({ loci });
		plugin.managers.camera.focusLoci(loci);
	}

	function focusInSimilarProteinStruct(structureIndices: number[], dataSourceName: string, pdbCode: string, chain: string) {
		const plugin = window.molstar;
		if (!plugin) {
			console.warn("Tried to focus on item in Mol* viewer, but the plugin is missing.");
			return;
		}

		// TODO maybe some check if keys exist?
		const simStruct = similarProteinStructures.current[dataSourceName][pdbCode][chain];

		const sel = getSelectionFromChainAuthId(simStruct.object, chain, structureIndices);
		const loci = StructureSelection.toLociWithSourceUnits(sel);
		plugin.managers.interactivity.lociHighlights.highlightOnly({ loci });
		plugin.managers.camera.focusLoci(loci);
	}
});
