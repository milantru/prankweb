import { useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useInterval } from "../../shared/hooks/useInterval";
import { useVisibilityChange } from "../../shared/hooks/useVisibilityChange";
import { DataStatus, getAllChainsAPI, getConservationsAPI, getDataSourceExecutorResultAPI, getDataSourceExecutorResultStatusAPI, getQuerySeqToStrMappingsAPI } from "../../shared/services/apiCalls";
import RcsbSaguaro, { RcsbSaguaroHandle } from "./components/RcsbSaguaro";
import { FadeLoader, ScaleLoader } from "react-spinners";
import { MolStarWrapper, MolStarWrapperHandle } from "./components/MolstarWrapper";
import { toastWarning } from "../../shared/helperFunctions/toasts";
import ErrorMessageBox from "./components/ErrorMessageBox";
import SettingsPanel, { StructureOption } from "./components/SettingsPanel";
import TogglerPanels from "./components/TogglerPanels";
import { RcsbFv } from "@rcsb/rcsb-saguaro";
import "./AnalyticalPage.tsx.css"
import { Canvas3D } from "molstar/lib/mol-canvas3d/canvas3d";
import { Bond, StructureElement, StructureProperties } from "molstar/lib/mol-model/structure";
import { Loci } from "molstar/lib/mol-model/loci";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const POLLING_INTERVAL = 1000 * 0.5; // every 0,5 second

export type Conservation = {
	index: number;
	value: number;
};

type AlignmentData = {
	querySequence?: string; // This prop will be artificially added and used when aligning similar proteins
	querySeqAlignedPartStartIdx: number;
	querySeqAlignedPartEndIdx: number;
	querySeqAlignedPart: string;
	similarSequence: string;
	similarSeqAlignedPartStartIdx: number;
	similarSeqAlignedPartEndIdx: number;
	similarSeqAlignedPart: string;
};

export type Residue = {
	sequenceIndex: number;
	structureIndex: number;
}

export type BindingSite = {
	id: string;
	confidence: number;
	residues: Residue[];
};

type UnalignedSimilarProtein = {
	pdbId: string; // pdb id of the similar sequence
	pdbUrl: string;
	sequence: string;
	chain: string;
	bindingSites: BindingSite[];
	seqToStrMapping: Record<number, number>; // seqToStrMapping[seqIdx] -> structIdx
	alignmentData: AlignmentData;
};

type Metadata = {
	dataSource: string;
	timestamp: Date;
};

type UnalignedResult = {
	id: string; // id from the IdProvider
	sequence: string; // query sequence
	chain: string;
	pdbUrl: string;
	bindingSites: BindingSite[]; // e.g. found them experimentally (1 source) or predicted (another source) 
	metadata: Metadata;
};

export type UnprocessedResult = {
	id: string; // id from the IdProvider
	sequence: string; // query sequence
	chain: string;
	pdbUrl: string;
	bindingSites: BindingSite[]; // e.g. found them experimentally (1 source) or predicted (another source) 
	similarProteins: UnalignedSimilarProtein[] | null;
	metadata: Metadata;
};

type DataSourceExecutor = {
	name: string; // name of the data source used to fetch results, e.g. "plm" 
	displayName: string; // used for displaying in UI, e.g. "pLM" instead of "plm"
	// one result for each chain (here will be stored results from data source executors temporarily until all are fetched)
	results: UnprocessedResult[];
};

export type SimilarProtein = {
	pdbId: string;
	pdbUrl: string;
	sequence: string;
	chain: string;
	bindingSites: BindingSite[];
	seqToStrMapping: Record<number, number>; // seqToStrMapping[seqIdx] -> structIdx
};

export type ProcessedResult = {
	pdbUrl: string; // TODO asi nad daj jak aj query seq daj lebo to je asi pre query tak nech pri query seq je
	bindingSites: BindingSite[]; // e.g. found them experimentally (1 source) or predicted (another source) 
	/* The original idea was that similar proteins are optional so they could be null,
	 * but it seems even though the server (Python) sets it to None, package used
	 * to turn snake case to camel case makes it undefined, not null. So it is probably
	 * never null. The value is either set or undefined. But because of defensive 
	 * programming, let's assume it can be also null. */
	similarProteins: SimilarProtein[] | undefined | null;
};

type DataSourceExecutorResult = Record<string, ProcessedResult>; // DataSourceExecutorResult[data source name] -> ProcessedResult

type StatusMessage = {
	message: string;
	isDone: boolean;
};

export type ChainResult = {
	querySequence: string,
	seqToStrMapping: Record<number, number>; // seqToStrMapping[seqIdx] -> structIdx
	dataSourceExecutorResults: DataSourceExecutorResult;
	conservations: Conservation[];
};

function AnalyticalPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const id = searchParams.get("id");
	if (!id) {
		return <>No id provided.</>
	}
	const chainsFromParams = searchParams.get("chains")
		? searchParams.get("chains").split(",").filter(x => x.length > 0)
		: [] // When no chains are selected by the user, we select all of them (we fetch all chains later when fetching results)

	const useConservation = searchParams.get("useConservation")?.toLowerCase() === "true";
	// When pollingInterval is set to null, it is turned off (initially it's turned off, it will be turned on after component loading)
	const [pollingInterval, setPollingInterval] = useState<number | null>(null);
	const isPageVisible = useVisibilityChange();
	const dataSourceExecutors = useRef<DataSourceExecutor[]>([
		{ name: "plm", displayName: "pLM", results: [] },
		{ name: "p2rank", displayName: "P2Rank", results: [] },
		{ name: "foldseek", displayName: "Foldseek", results: [] }
	]);
	const isFetching = useRef<boolean[]>(new Array(dataSourceExecutors.current.length).fill(false));
	const isPollingFinished = useRef<boolean[]>(new Array(dataSourceExecutors.current.length).fill(false));
	const [errorMessages, setErrorMessages] = useState<string[]>(new Array(dataSourceExecutors.current.length).fill(""));
	const [currChainResult, setCurrChainResult] = useState<ChainResult | null>(null);
	const [statusMessages, setStatusMessages] = useState<StatusMessage[]>(new Array(dataSourceExecutors.current.length).fill({ message: "", isDone: false }));
	const [selectedChain, setSelectedChain] = useState<string | null>(null); // Will be set when chain results are set
	const [selectedStructures, setSelectedStructures] = useState<StructureOption[]>([]);
	const [squashBindingSites, setSquashBindingSites] = useState<boolean>(false);
	const [startQuerySequenceAtZero, setStartQuerySequenceAtZero] = useState<boolean>(false);
	// TODO komentovane?
	// queryProteinLigandData[dataSourceName][chain][bindingSiteId] -> true/false to show bindings site (and also ligands if available)
	// similarProteinLigandData[dataSourceName][pdbCode][chain][bindingSiteId] -> true/false to show bindings site (and also ligands if available)
	// bindingSiteId can be e.g. H_SO4, but it can also be prediction e.g. pocket_1
	const [queryProteinBindingSitesData, setQueryProteinBindingSitesData] = useState<Record<string, Record<string, Record<string, boolean>>>>({});
	const [similarProteinBindingSitesData, setSimilarProteinBindingSitesData] = useState<Record<string, Record<string, Record<string, Record<string, boolean>>>>>({});
	const [isMolstarLoadingStructures, setIsMolstarLoadingStructures] = useState<boolean>(true);
	const molstarWrapperRef = useRef<MolStarWrapperHandle>(null!);
	const rcsbSaguaroRef = useRef<RcsbSaguaroHandle>(null!);
	const [allDataFetched, setAllDataFetched] = useState<boolean>(false);
	const chains = useRef<string[]>([]);
	// After data processing it will be possible to do seqToStrMappings[chain][rcsb position - 1] -> structure index in molstar
	const seqToStrMappings = useRef<Record<string, Record<number, number>>>(null!); // seqToStrMappings[chain][seqIdx] -> structIdx
	// bindingSiteSupportCounter[chain][residue index in structure (of pocket)] -> number of data sources supporting that residue is part of binding site
	const [bindingSiteSupportCounter, setBindingSiteSupportCounter] = useState<Record<string, Record<number, number>>>({});
	const isMolstarLinkedToRcsb = useRef<boolean>(false);
	// unalignedResult[dataSourceName] -> UnalignedResult for currently selected chain
	const unalignedResult = useRef<Record<string, UnalignedResult>>({});
	// unalignedSimProts[dataSourceName] -> UnalignedSimilarProtein for currently selected chain
	const unalignedSimProts = useRef<Record<string, UnalignedSimilarProtein[]>>({});
	const conservations = useRef<Conservation[]>([]); // conservations for currently selected query chain

	useEffect(() => {
		if (isPollingFinished.current.every(x => x)) {
			/* If polling is finished for every data source, we don't want to turn it on again.
			 * That is why we have this if here.
			 * Moreover, we don't have to set pollingInterval to null here (in this if), because
			 * it was set to null at the end of useInterval already. */
			return;
		}
		setPollingInterval(isPageVisible ? POLLING_INTERVAL : null);
	}, [isPageVisible]);

	useEffect(() => {
		/* There is a polling implemented in useInterval but it would start after POLLING_INTERVAL. If we want to try to
		 * fetch data immediatelly after loading page (and not wait POLLING_INTERVAL), we use this useEffect.
		 * If all of the data is not fetched yet, no problem, there is polling in useInterval which will poll for the rest. */
		for (let dataSourceExecutorIdx = 0; dataSourceExecutorIdx < dataSourceExecutors.current.length; dataSourceExecutorIdx++) {
			fetchDataFromDataSource(dataSourceExecutorIdx);
		}

		setPollingInterval(POLLING_INTERVAL); // turn on the polling
	}, []);

	useEffect(() => {
		function stopPollingAndAlignSequences(dataSourceExecutors: DataSourceExecutor[], defaultChain: string) {
			// Turn off polling entirely (for all data sources)
			setPollingInterval(null);

			// Aligning will take place in the following function
			handleChainSelect(dataSourceExecutors, defaultChain);
		}

		if (allDataFetched) {
			// both dataSourceExecutors and chains should be already initialized when allDataFetched is set to true
			const defaultChain = chains.current[0]; // Protein always has at least 1 chain

			stopPollingAndAlignSequences(dataSourceExecutors.current, defaultChain);
		}
	}, [allDataFetched]);

	useEffect(() => {
		if (isMolstarLinkedToRcsb.current || isMolstarLoadingStructures || !molstarWrapperRef.current || !rcsbSaguaroRef.current) {
			return;
		}

		const molstarPlugin = molstarWrapperRef.current.getMolstarPlugin();
		const rcsbPlugin = rcsbSaguaroRef.current.getRcsbPlugin();
		linkMolstarToRcsb(molstarPlugin, rcsbPlugin);
	}, [isMolstarLoadingStructures]);

	useInterval(() => {
		for (let dataSourceExecutorIdx = 0; dataSourceExecutorIdx < dataSourceExecutors.current.length; dataSourceExecutorIdx++) {
			if (isFetching.current[dataSourceExecutorIdx] || isPollingFinished.current[dataSourceExecutorIdx]) {
				continue;
			}
			fetchDataFromDataSource(dataSourceExecutorIdx);
		}
	}, pollingInterval);

	return (
		<div className="w-100">
			{errorMessages.some(errMsg => errMsg.length > 0) && (
				<ErrorMessageBox classes="mt-2" errorMessages={errorMessages} onClose={clearErrorMessages} />
			)}

			{!allDataFetched && (
				<div className="container-fluid pt-2">
					<div className="box-wrapper mx-auto">
						<ul className="list-group shadow-sm">
							{statusMessages.map((msg, idx) =>
								msg.message ? (
									<li
										key={idx}
										className={`list-group-item d-flex flex-column flex-sm-row align-items-start align-items-sm-center py-1 ${msg.isDone ? "list-group-item-success" : "list-group-item-light"
											}`}
									>
										<div className="d-flex align-items-center">
											{msg.isDone ? (
												<></>
											) : (
												<span className="custom-spinner mr-3" role="status" />
											)}
											<span>{msg.message}</span>
										</div>
									</li>
								) : null
							)}
						</ul>
					</div>
				</div>
			)}
			<div id="visualizations">
				{/* Sometimes when RcsbSaguro rerendered it kept rerendering over and over again. If you resized the window,
					it stopped (sometimes it stopped on its own without resizing). When minHeight: "100vh" was added, 
					this weird behavior disappeared. */}
				<div id="visualization-rcsb">
					{currChainResult && chains.current.length > 0 ? (
						<div className="d-flex flex-column align-items-center">
							{/* Settings/Filter panel */}
							<div className="d-flex w-100 position-relative px-3">
								<SettingsPanel classes="w-100 mx-auto mt-2 px-3 py-2"
									chains={chains.current}
									dataSourcesSimilarProteins={unalignedSimProts.current}
									squashBindingSites={squashBindingSites}
									startQuerySequenceAtZero={startQuerySequenceAtZero}
									isDisabled={isMolstarLoadingStructures}
									onChainSelect={selectedChain => handleChainSelect(dataSourceExecutors.current, selectedChain)}
									onBindingSitesSquashClick={() => setSquashBindingSites(prevState => !prevState)}
									onStartQuerySequenceAtZero={() => setStartQuerySequenceAtZero(prevState => !prevState)}
									onStructuresSelect={handleStructuresSelect} />
								{isMolstarLoadingStructures &&
									<ScaleLoader className="position-absolute w-100 h-100 justify-content-center align-items-center"
										height={"21px"}
										color="#878787" />
								}
							</div>

							<RcsbSaguaro ref={rcsbSaguaroRef}
								classes="w-100 mt-2"
								chainResult={currChainResult}
								squashBindingSites={squashBindingSites}
								startQuerySequenceAtZero={startQuerySequenceAtZero}
								onHighlight={handleRcsbHighlight}
								onClick={handleRcsbClick} />
						</div>
					) : (
						<div className="p-4 w-100">
							<Skeleton height={60} count={1} className="mb-2" />
							<Skeleton height={400} />
						</div>
					)}
				</div>
				<div id="visualization-molstar">
					{currChainResult && selectedChain && selectedChain in bindingSiteSupportCounter ? (<>
						<div className="w-100 d-flex justify-content-center align-items-center mb-2 px-4">
							<MolStarWrapper ref={molstarWrapperRef}
								chainResult={currChainResult}
								selectedChain={selectedChain}
								selectedStructures={selectedStructures}
								bindingSiteSupportCounter={bindingSiteSupportCounter[selectedChain]}
								dataSourceCount={dataSourceExecutors.current.length}
								queryProteinBindingSitesData={queryProteinBindingSitesData}
								similarProteinBindingSitesData={similarProteinBindingSitesData}
								onStructuresLoadingStart={() => setIsMolstarLoadingStructures(true)}
								onStructuresLoadingEnd={() => setIsMolstarLoadingStructures(false)} />
						</div>
						{queryProteinBindingSitesData && similarProteinBindingSitesData && (
							<TogglerPanels classes="px-4"
								queryProteinBindingSitesData={queryProteinBindingSitesData}
								similarProteinsBindingSitesData={similarProteinBindingSitesData}
								isDisabled={isMolstarLoadingStructures}
								onQueryProteinBindingSiteToggle={handleQueryProteinBindingSiteToggle}
								onSimilarProteinBindingSiteToggle={handleSimilarProteinBindingSiteToggle} />
						)}
					</>) : (
						<div className="p-4 w-100">
							<Skeleton height={400} />
							<Skeleton height={40} className="mt-3" />
							<Skeleton height={40} className="mt-2" />
						</div>
					)}
				</div>
			</div>
		</div>
	);

	async function tryGetChains(): Promise<{ chains: string[], errMsg: string }> {
		let chainsRes: string[] = [];

		if (chainsFromParams.length === 0) {
			/* Every protein has at least one chain. No chains means none was selected by the user so we select all.
			 * When status is ready, the chains.json (on the server, containing all the chains) should be ready as well,
			 * so if we don't have the chains, we can get all of them from it. */
			const { chains, userFriendlyErrorMessage } = await getAllChainsAPI(id);
			if (userFriendlyErrorMessage.length > 0) {
				return { chains: [], errMsg: userFriendlyErrorMessage };
			}

			chainsRes = chains;
		} else {
			chainsRes = chainsFromParams;
		}

		return { chains: chainsRes, errMsg: "" };
	}

	async function tryGetResult(
		dataSourceName: string,
		id: string,
		chain: string,
		useConservation: boolean
	): Promise<{ result: UnprocessedResult | null, errMsg: string }> {
		const {
			result,
			userFriendlyErrorMessage
		} = await getDataSourceExecutorResultAPI(dataSourceName, id, chain, useConservation);

		if (userFriendlyErrorMessage.length > 0) {
			return { result: null, errMsg: userFriendlyErrorMessage };
		}

		return { result: result, errMsg: "" };
	}

	async function getResults(dataSourceIndex: number, id: string, chains: string[], useConservation: boolean) {
		const results: UnprocessedResult[] = [];

		for (let i = 0; i < chains.length; i++) {
			const {
				result,
				errMsg: dataFetchingErrorMessage
			} = await tryGetResult(dataSourceExecutors.current[dataSourceIndex].name, id, chains[i], useConservation);

			if (dataFetchingErrorMessage.length > 0) {
				toastWarning(dataFetchingErrorMessage + "\nRetrying...");
				i--; // Try again for the same chain
				continue;
			}
			results.push(result);
		}

		return results;
	}

	async function fetchDataFromDataSource(dataSourceIndex: number) {
		isFetching.current[dataSourceIndex] = true;
		console.info("Polling data source executor: " + dataSourceExecutors.current[dataSourceIndex].name);

		// Get status
		const {
			status,
			infoMessage,
			userFriendlyErrorMessage: statusFetchingErrorMessage
		} = await getDataSourceExecutorResultStatusAPI(dataSourceExecutors.current[dataSourceIndex].name, id, useConservation);
		if (statusFetchingErrorMessage.length > 0) {
			if (useConservation && dataSourceExecutors.current[dataSourceIndex].name === "p2rank") {
				// We are waiting for the conservation
				updateStatusMessages(dataSourceIndex, dataSourceExecutors.current[dataSourceIndex].displayName + ": Waiting for conservation data");
			}
			console.warn(statusFetchingErrorMessage + "\nRetrying...");
			isFetching.current[dataSourceIndex] = false;
			return;
		}

		// Init chains (either from params, or from servers chains file which should be already created when status is retrieved)
		const { chains: chainsTmp, errMsg: allChainsFetchingErrorMessage } = await tryGetChains();
		if (allChainsFetchingErrorMessage.length > 0) {
			toastWarning(allChainsFetchingErrorMessage + "\nRetrying...");
			isFetching.current[dataSourceIndex] = false;
			return;
		}
		chains.current = chainsTmp;
		const defaultChain = chainsTmp[0]; // Protein always has at least 1 chain
		setSelectedChain(defaultChain);

		/* Init seq to struct mappings if not init yet (just for query protein now, 
		 * later, alfter aligning, gaps may occur in master query seq, so to fill each
		 * position, even gaps, mappings and struct indices from similar proteins will be used). */
		if (!seqToStrMappings.current) {
			const {
				seqToStrMappings: seqToStrMappingsTmp,
				userFriendlyErrorMessage: querySeqToStrMappingsFetchingErrorMessage
			} = await getQuerySeqToStrMappingsAPI(id);
			if (querySeqToStrMappingsFetchingErrorMessage.length > 0) {
				toastWarning(querySeqToStrMappingsFetchingErrorMessage + "\nRetrying...");
				isFetching.current[dataSourceIndex] = false;
				return;
			}
			seqToStrMappings.current = seqToStrMappingsTmp;
		}

		// Choose next action depending on status
		if (status === DataStatus.Processing) {
			isFetching.current[dataSourceIndex] = false;
			updateStatusMessages(dataSourceIndex, `${dataSourceExecutors.current[dataSourceIndex].displayName}: ${infoMessage}`, false);
			return;
		} else if (status === DataStatus.Failed) {
			const errMsg = `Failed to fetch data from ${dataSourceExecutors.current[dataSourceIndex].displayName}, skipping.`;
			updateErrorMessages(dataSourceIndex, errMsg);
		} else if (status === DataStatus.Completed) {
			const results = await getResults(dataSourceIndex, id, chainsTmp, useConservation);
			dataSourceExecutors.current[dataSourceIndex].results = results;
			updateStatusMessages(dataSourceIndex, `${dataSourceExecutors.current[dataSourceIndex].displayName}: ${infoMessage}`, true);
		} else {
			throw new Error("Unknown status."); // This should never happen.
		}

		/* Either was processing successful and we got the result (Status.Completed),
		 * or it failed and we won't get result ever (Status.Failed). This means polling for this
		 * data source result is not required anymore, and we can stop it. */
		isPollingFinished.current[dataSourceIndex] = true;

		if (isPollingFinished.current.every(x => x)) {
			// Polling is finished for all data sources
			setAllDataFetched(true);
		}
		isFetching.current[dataSourceIndex] = false;
	}

	function replaceWithAlignedPart(
		sequence: string,
		alignedPartStartIdx: number,
		alignedPartEndIdx: number,
		alignedPart: string
	) {
		const startPart = sequence.slice(0, alignedPartStartIdx);
		const endPart = sequence.slice(alignedPartEndIdx + 1);

		return startPart + alignedPart + endPart;
	}

	function createMapping(sequenceWithoutGaps: string, sequenceWithGaps: string) {
		// key: idx in original seq without gaps, value: idx in query seq with gaps
		const mapping: Record<number, number> = {};

		for (let i = 0, j = 0; i < sequenceWithoutGaps.length; i++, j++) {
			let aminoAcidOrGap = sequenceWithGaps[j];
			if (aminoAcidOrGap === "-") {
				do {
					j++;
					aminoAcidOrGap = sequenceWithGaps[j];
				} while (aminoAcidOrGap === "-");
				/* In do while we don't have to check for j < sequence.length, there always has to be
				 * some related amino acid (because we have the same sequence but one is with gaps). */
			}

			mapping[i] = j;
		}

		return mapping;
	}

	function updateBindingSiteResiduesIndices(bindingSite: BindingSite, mapping: Record<number, number>) {
		for (let i = 0; i < bindingSite.residues.length; i++) {
			if (bindingSite.residues[i].sequenceIndex === undefined) {
				console.error("Residue is undefined. Sequence display might not fully load or ommit some data.");
			} else if (!(bindingSite.residues[i].sequenceIndex in mapping)) {
				console.error("Mapping for residue does not exist. Sequence display might not fully load or ommit some data.");
			}
			bindingSite.residues[i].sequenceIndex = mapping[bindingSite.residues[i].sequenceIndex];
		}
	}

	/**
	 * Updates a sequence-to-structure mapping based on a provided index remapping.
	 *
	 * This function takes an existing mapping (`mappingToUpdate`) from sequence indices to structure indices,
	 * and remaps its keys using another mapping (`mappingUsedToUpdate`). The resulting mapping uses the new
	 * sequence indices (from `mappingUsedToUpdate`) while preserving the original structure indices.
	 *
	 * @param mappingToUpdate - A record where keys are original sequence indices and values are structure indices.
	 * @param mappingUsedToUpdate - A record mapping old sequence indices to new sequence indices.
	 * @returns A new record mapping the updated sequence indices to the original structure indices.
	 *
	 * @example
	 * getUpdatedSeqToStructMapping({0: 100, 1: 101}, {0: 10, 1: 11})
	 * // Returns: {10: 100, 11: 101}
	 */
	function getUpdatedSeqToStructMapping(mappingToUpdate: Record<number, number>, mappingUsedToUpdate: Record<number, number>) {
		const newSeqToStrMapping: Record<number, number> = {};

		for (const [seqIdx, structIdx] of Object.entries(mappingToUpdate)) {
			const newSeqIdx = mappingUsedToUpdate[seqIdx];
			if (newSeqIdx !== undefined) { // TODO this if should not be needed
				newSeqToStrMapping[newSeqIdx] = structIdx;
			}
		}

		return newSeqToStrMapping;
	}

	function alignQueryAndSimilarSequence(querySequence: string, similarProtein: UnalignedSimilarProtein) {
		let querySeq = replaceWithAlignedPart(
			querySequence,
			similarProtein.alignmentData.querySeqAlignedPartStartIdx,
			similarProtein.alignmentData.querySeqAlignedPartEndIdx,
			similarProtein.alignmentData.querySeqAlignedPart
		);
		let similarSeq = replaceWithAlignedPart(
			similarProtein.alignmentData.similarSequence,
			similarProtein.alignmentData.similarSeqAlignedPartStartIdx,
			similarProtein.alignmentData.similarSeqAlignedPartEndIdx,
			similarProtein.alignmentData.similarSeqAlignedPart
		);
		const querySeqAlignedPartStartIdx = similarProtein.alignmentData.querySeqAlignedPartStartIdx;
		const targetSeqAlignedPartStartIdx = similarProtein.alignmentData.similarSeqAlignedPartStartIdx;

		/* Pad the beginning of the sequence with the smaller start index  
		 * to align the start indices of both sequences. */
		if (querySeqAlignedPartStartIdx < targetSeqAlignedPartStartIdx) {
			const gapCount = targetSeqAlignedPartStartIdx - querySeqAlignedPartStartIdx;
			querySeq = querySeq.padStart(querySeq.length + gapCount, "-");
			similarProtein.alignmentData.querySeqAlignedPartStartIdx += gapCount;
		} else {
			const gapCount = querySeqAlignedPartStartIdx - targetSeqAlignedPartStartIdx;
			similarSeq = similarSeq.padStart(similarSeq.length + gapCount, "-");
			similarProtein.alignmentData.similarSeqAlignedPartStartIdx += gapCount;
		}

		// Pad the shorter sequence to match the length of the longer one.
		if (querySeq.length < similarSeq.length) {
			const gapCount = similarSeq.length - querySeq.length;
			querySeq = querySeq.padEnd(querySeq.length + gapCount, "-");
		} else {
			const gapCount = querySeq.length - similarSeq.length;
			similarSeq = similarSeq.padEnd(similarSeq.length + gapCount, "-");
		}

		// Update all residue indices of each result bindig site
		const mapping = createMapping(similarProtein.alignmentData.similarSequence, similarSeq);
		similarProtein.bindingSites.forEach(bindingSite =>
			updateBindingSiteResiduesIndices(bindingSite, mapping));

		// Update seq indices in seq to struct mapping
		similarProtein.seqToStrMapping = getUpdatedSeqToStructMapping(similarProtein.seqToStrMapping, mapping);

		// Update with aligned query and similar seq
		similarProtein.alignmentData.querySequence = querySeq;
		similarProtein.alignmentData.similarSequence = similarSeq;
	}

	function alignSequencesAcrossAllDataSources(
		unprocessedResultPerDataSourceExecutor: Record<string, UnalignedResult>,
		dataSourcesSimilarProteins: Record<string, UnalignedSimilarProtein[]>,
		conservations: Conservation[],
		chain: string
	): ChainResult {
		// unprocessedResultPerDataSourceExecutor[dataSourceName] -> UnprocessedResult
		const dataSourceExecutorsCount = Object.keys(unprocessedResultPerDataSourceExecutor).length;
		if (dataSourceExecutorsCount == 0) {
			// if we dont have any result from any data source executor, then we have nothing to align
			return { querySequence: "", seqToStrMapping: {}, dataSourceExecutorResults: {}, conservations: [] };
		}
		// TODO what if we have data source executor results but no with sim prots? Maybe add if?

		// TODO issue #23 ["foldseek"] a ?? nestaci, binding sity nie su poposuvane...
		const querySeq = unprocessedResultPerDataSourceExecutor["foldseek"]?.sequence
			?? Object.values(unprocessedResultPerDataSourceExecutor)[0].sequence;
		const querySeqLength = querySeq.length; // Length of the query sequence (sequence with no gaps)

		/* "Preprocessing phase": Align query and similar sequences while also updating binding site indices.
		 * Results without similar sequences are skipped (unchanged). */
		for (const [dataSourceName, similarProteins] of Object.entries(dataSourcesSimilarProteins)) {
			// TODO issue #23
			// const querySeq = unprocessedResult.sequence;
			// Creates pairs of query seq and similar seq and aligns them (updates using reference) 
			for (const simProt of similarProteins) {
				alignQueryAndSimilarSequence(querySeq, simProt);
			}
		}

		/* "Merge phase": Create master query sequence and align other sequences and binding sites to it.
		 * Master query sequence is query sequence on which every similar sequence and binding site can be aligned with/mapped to. */
		let masterQuerySeq = "";
		const similarProteins: Record<string, SimilarProtein[]> = {};
		for (const [dataSourceName, unalignedSimilarProteins] of Object.entries(dataSourcesSimilarProteins)) {
			similarProteins[dataSourceName] = unalignedSimilarProteins.map<SimilarProtein>(simProt => ({
				pdbId: simProt.pdbId,
				pdbUrl: simProt.pdbUrl,
				chain: simProt.chain,
				bindingSites: simProt.bindingSites,
				seqToStrMapping: simProt.seqToStrMapping,
				sequence: "" // will be set later when aligning
			}));
		}

		const offsets: Record<string, number[]> = {};
		for (const [dataSourceName, similarProteins] of Object.entries(dataSourcesSimilarProteins)) {
			offsets[dataSourceName] = new Array(similarProteins.length).fill(0);
		}

		/* Now we are going to create 2 mappings: A and B.
		 * A is for general mapping from query sequence to master query sequence which we are going to create (that's
		 * the one at the top of the sequence display). We can use it e.g. to map residues of predicted 
		 * binding sites of query sequence (to residues of master query sequence).
		 * The other mapping (B) is for mapping similar proteins to master query protein. 
		 * It can be used e.g. to map binding sites of similar proteins to master query sequence. We need this
		 * separate mapping because binding site of similar protein is related to that similar protein,
		 * to its amino acid positions, and we are going to do the aligning now. So their (similar protein amino acids)
		 * indices are going to change. So we need to know from which amino acid of similar sequence 
		 * we are mapping to which master query amino acid. */
		// mapping A: mapping[idxFrom] -> idxTo
		const mapping: Record<number, number> = {};
		// mapping B: similarProteinsMapping[dataSourceName][simProtIdx][idxFrom] -> idxTo
		const similarProteinsMapping: Record<string, Record<number, number>[]> = {};
		for (const [dataSourceName, similarProteins] of Object.entries(dataSourcesSimilarProteins)) {
			similarProteinsMapping[dataSourceName] = Array.from(
				{ length: similarProteins.length },
				(): Record<number, number> => ({})
			);
		};

		for (let aminoAcidIdx = 0; aminoAcidIdx < querySeqLength; aminoAcidIdx++) {
			/* We can imagine sequence viewer as a table. We go through all data sources and all similar proteins,
			 * but we still look on the same index, we can imagine it as if we were going though one column.
			 * If in that column exists gap, it means we are in gap mode. This means we "output" to master query sequence 
			 * a gap ("-"). */
			const isGapMode = Object.entries(dataSourcesSimilarProteins).some(([dataSourceName, similarProteins]) =>
				similarProteins.some((simProt, simProtIdx) =>
					simProt.alignmentData.querySequence[aminoAcidIdx + offsets[dataSourceName][simProtIdx]] === '-'));

			let aminoAcidOfQuerySeq: string = null!;
			/* Master query sequence is being built iteratively character by character,
			 * that is why we can use masterQuerySeq.length to point to the newest character.
			 * This variable holds index of the current character (amino acid or gap) of
			 * master query sequence that will be outputted/added later in code. */
			const aminoAcidOrGapOfMasterQuerySeqCurrIdx = masterQuerySeq.length;
			mapping[aminoAcidIdx] = aminoAcidOrGapOfMasterQuerySeqCurrIdx;
			for (const [dataSourceName, unAlignedSimilarProteins] of Object.entries(dataSourcesSimilarProteins)) {
				for (let simProtIdx = 0; simProtIdx < unAlignedSimilarProteins.length; simProtIdx++) {
					const similarProtein = unAlignedSimilarProteins[simProtIdx];
					const offset = offsets[dataSourceName][simProtIdx];

					const aminoAcidOrGapOfQuerySeq = similarProtein.alignmentData.querySequence[aminoAcidIdx + offset];
					if (isGapMode) {
						if (aminoAcidOrGapOfQuerySeq === '-') {
							similarProteins[dataSourceName][simProtIdx].sequence += similarProtein.alignmentData.similarSequence[aminoAcidIdx + offset];
							similarProteinsMapping[dataSourceName][simProtIdx][aminoAcidIdx + offset] = aminoAcidOrGapOfMasterQuerySeqCurrIdx;
							offsets[dataSourceName][simProtIdx] = offset + 1;
						} else {
							similarProteins[dataSourceName][simProtIdx].sequence += '-';
						}
					} else {
						/* All of the results have the same query sequence (if we ignore gaps). On the (aminoAcidIdx + offset) index
						 * is the same amino acid for all the results, which means that here is (for all of the results)
						 * always assigned the same amino acid. Which might seem odd (that we keep reassigning the same value),
						 * but it is correct and to avoid further program branching it will be left like this. */
						aminoAcidOfQuerySeq = aminoAcidOrGapOfQuerySeq;
						similarProteins[dataSourceName][simProtIdx].sequence += similarProtein.alignmentData.similarSequence[aminoAcidIdx + offset];
						similarProteinsMapping[dataSourceName][simProtIdx][aminoAcidIdx + offset] = aminoAcidOrGapOfMasterQuerySeqCurrIdx;
					}
				}
			}

			if (isGapMode) {
				masterQuerySeq += '-';
				aminoAcidIdx--; // Sequences with gaps where shifted, repeat for the same amino acid
			} else {
				/* The only way `aminoAcidOfQuerySeq` can be null here is if we don't have any similar sequences at all (in any data source).
				 * So we cannot create master query sequence using similar sequence versions of query sequence with gaps (each similar sequence 
				 * should have its own version of query sequence with gaps), thus we have to use "default" query sequence without gaps
				 * to build master query sequence. (Yes, it will be identity mapping.) */
				masterQuerySeq += aminoAcidOfQuerySeq ?? querySeq[aminoAcidIdx];
			}
		}

		/* "Postprocessing phase": Update all residue indices of each binding site, seq to struct mappings,
		 * also count how many data sources support certain binding site. */
		// bindingSiteSupportCounterTmp[residue index in structure (of pocket)]: number of data sources supporting pocket on the index
		const bindingSiteSupportCounterTmp: Record<number, number> = {};
		for (const [dataSourceName, result] of Object.entries(unprocessedResultPerDataSourceExecutor)) {
			let supporterCounted: Record<number, boolean> = {}; // one data source can support residue just once

			// Update seq to struct indices mapping (mapping from query protein)
			seqToStrMappings.current[chain] = getUpdatedSeqToStructMapping(seqToStrMappings.current[chain], mapping);

			// Update residues of binding sites of query protein and count supporters
			for (const bindingSite of result.bindingSites) {
				updateBindingSiteResiduesIndices(bindingSite, mapping);

				for (const residue of bindingSite.residues) {
					if (supporterCounted[residue.structureIndex]) {
						continue;
					}

					if (!(residue.structureIndex in bindingSiteSupportCounterTmp)) {
						bindingSiteSupportCounterTmp[residue.structureIndex] = 0;
					}
					bindingSiteSupportCounterTmp[residue.structureIndex] += 1;
					supporterCounted[residue.structureIndex] = true;
				}
			}

			const unalignedSimilarProteins = dataSourcesSimilarProteins[dataSourceName]
			if (!unalignedSimilarProteins) {
				continue;
			}
			// Update residues of binding sites of all similar proteins, update seq to struct mappings, and also count supporters
			for (let simProtIdx = 0; simProtIdx < unalignedSimilarProteins.length; simProtIdx++) {
				const simProt = unalignedSimilarProteins[simProtIdx];
				const simProtMapping = similarProteinsMapping[dataSourceName][simProtIdx];

				// Update seq to struct mappings (from similar proteins)
				simProt.seqToStrMapping = getUpdatedSeqToStructMapping(simProt.seqToStrMapping, simProtMapping);
				for (const [seqIdx, structIdx] of Object.entries(simProt.seqToStrMapping)) {
					if (seqIdx in seqToStrMappings.current[chain]) {
						continue;
					}
					seqToStrMappings.current[chain][seqIdx] = structIdx;
				}

				// Update residues of binding sites and count supporters
				for (const bindingSite of simProt.bindingSites) {
					updateBindingSiteResiduesIndices(bindingSite, simProtMapping);

					for (const residue of bindingSite.residues) {
						if (supporterCounted[residue.structureIndex]) {
							continue;
						}

						if (!(residue.structureIndex in bindingSiteSupportCounterTmp)) {
							bindingSiteSupportCounterTmp[residue.structureIndex] = 0;
						}
						bindingSiteSupportCounterTmp[residue.structureIndex] += 1;
						supporterCounted[residue.structureIndex] = true;
					}
				}
			}
		}
		for (const conservation of conservations) {
			conservation.index = mapping[conservation.index];
		}
		setBindingSiteSupportCounter(prevState => ({
			...prevState,
			[chain]: bindingSiteSupportCounterTmp
		}));

		const dataSourceExecutorResultsTmp: Record<string, ProcessedResult> = {};
		Object.entries(unprocessedResultPerDataSourceExecutor).forEach(([dataSourceName, result]) =>
			dataSourceExecutorResultsTmp[dataSourceName] = {
				pdbUrl: result.pdbUrl,
				bindingSites: result.bindingSites,
				similarProteins: similarProteins[dataSourceName]
			}
		);

		return {
			querySequence: masterQuerySeq,
			seqToStrMapping: seqToStrMappings.current[chain],
			dataSourceExecutorResults: dataSourceExecutorResultsTmp,
			conservations: conservations
		};
	}

	function prepareUnalignedDataForQueryChain(dataSourceExecutors: DataSourceExecutor[], chain: string) {
		function transform(unprocessedResults: UnprocessedResult[]) {
			// should transform results so we can access them like this: res[chain][dataSourceName] -> result
			const res: Record<string, Record<string, UnprocessedResult>> = {};

			unprocessedResults.forEach(ur => {
				if (!(ur.chain in res)) {
					res[ur.chain] = {};
				}

				res[ur.chain][ur.metadata.dataSource] = ur;
			});

			return res;
		}

		const allResults = dataSourceExecutors.flatMap(x => x.results);
		const chainUnprocessedResults = transform(allResults);
		const dataSourceResults = chainUnprocessedResults[chain];

		// unalignedResultTmp[chain][dataSourceName] -> UnalignedResult
		const unalignedResultTmp: Record<string, UnalignedResult> = {};
		// unalignedSimProtsTmp[chain][dataSourceName] -> UnalignedSimilarProtein
		const unalignedSimProtsTmp: Record<string, UnalignedSimilarProtein[]> = {};

		for (const [dataSourceName, unprocessedResult] of Object.entries(dataSourceResults)) {
			const unprocessedResultWithoutSimilarProteins: UnalignedResult = {
				id: unprocessedResult.id,
				sequence: unprocessedResult.sequence,
				chain: unprocessedResult.chain,
				pdbUrl: unprocessedResult.pdbUrl,
				bindingSites: unprocessedResult.bindingSites,
				metadata: unprocessedResult.metadata
			};
			unalignedResultTmp[dataSourceName] = unprocessedResultWithoutSimilarProteins;

			if (!unprocessedResult.similarProteins) {
				continue;
			}
			const simProts: UnalignedSimilarProtein[] = []
			for (const simProt of unprocessedResult.similarProteins) {
				simProts.push(simProt);
			}
			unalignedSimProtsTmp[dataSourceName] = simProts;
		}

		unalignedResult.current = unalignedResultTmp;
		unalignedSimProts.current = unalignedSimProtsTmp;
	}

	function alignSequences(options: StructureOption[], chain: string) {
		setCurrChainResult(null);
		// Get selected sim prots
		const selectedSimProts: Record<string, UnalignedSimilarProtein[]> = {};
		for (const [dataSourceName, simProts] of Object.entries(unalignedSimProts.current)) {
			for (const simProt of simProts) {
				const isInOptions = options.some(o => o.value.dataSourceName === dataSourceName
					&& o.value.pdbId === simProt.pdbId
					&& o.value.chain === simProt.chain);
				if (!isInOptions) {
					continue;
				}

				if (!(dataSourceName in selectedSimProts)) {
					selectedSimProts[dataSourceName] = [];
				}
				selectedSimProts[dataSourceName].push({ ...simProt });
			}
		}

		// Perform aligning
		const unalignedResultDeepCopy = JSON.parse(JSON.stringify(unalignedResult.current));
		const selectedSimProtsDeepCopy = JSON.parse(JSON.stringify(selectedSimProts));
		const conservationsDeepCopy = JSON.parse(JSON.stringify(conservations.current));
		const chainResult = alignSequencesAcrossAllDataSources(
			unalignedResultDeepCopy, selectedSimProtsDeepCopy, conservationsDeepCopy, chain);

		setCurrChainResult(chainResult);
		return chainResult;
	}

	function updateErrorMessages(dataSourceIndex: number, errorMessage: string) {
		setErrorMessages(prevState =>
			prevState.map((errMsg, i) => dataSourceIndex === i ? errorMessage : errMsg));
	};

	function updateStatusMessages(dataSourceIndex: number, statusMessage: string, isDone: boolean = false) {
		setStatusMessages(prevState =>
			prevState.map((msg, i) =>
				dataSourceIndex === i ? { message: statusMessage, isDone } : msg
			)
		);
	}

	function clearErrorMessages() {
		setErrorMessages(new Array(dataSourceExecutors.current.length).fill(""));
	}

	/** Returns object that holds information which binding sites (and ligands if available) of similar proteins are displayed. */
	function getSimilarProteinLigandData(chainResult: ChainResult, selectedStructureOptions: StructureOption[]) {
		// res[dataSourceName][pdbCode][chain][bindingSiteId] -> true/false whether is binding site (and ligands if available) displayed
		const res: Record<string, Record<string, Record<string, Record<string, boolean>>>> = {};

		for (const [dataSourceName, result] of Object.entries(chainResult.dataSourceExecutorResults)) {
			if (!result.similarProteins) {
				continue;
			}

			for (const simProt of result.similarProteins) {
				const isStructureSelected = selectedStructureOptions.some(
					x => x.value.dataSourceName === dataSourceName
						&& x.value.pdbId === simProt.pdbId
						&& x.value.chain === simProt.chain
				);
				if (!isStructureSelected) {
					continue;
				}

				if (simProt.bindingSites.length === 0) {
					if (!(dataSourceName in res)) {
						res[dataSourceName] = {};
					}
					if (!(simProt.pdbId in res[dataSourceName])) {
						res[dataSourceName][simProt.pdbId] = {};
					}
					if (!(simProt.chain in res[dataSourceName][simProt.pdbId])) {
						res[dataSourceName][simProt.pdbId][simProt.chain] = {};
					}
				}
				for (const bindingSite of simProt.bindingSites) {
					if (!(dataSourceName in res)) {
						res[dataSourceName] = {};
					}
					if (!(simProt.pdbId in res[dataSourceName])) {
						res[dataSourceName][simProt.pdbId] = {};
					}
					if (!(simProt.chain in res[dataSourceName][simProt.pdbId])) {
						res[dataSourceName][simProt.pdbId][simProt.chain] = {};
					}

					let newValue = false;
					if (dataSourceName in similarProteinBindingSitesData
						&& simProt.pdbId in similarProteinBindingSitesData[dataSourceName]
						&& simProt.chain in similarProteinBindingSitesData[dataSourceName][simProt.pdbId]
						&& bindingSite.id in similarProteinBindingSitesData[dataSourceName][simProt.pdbId][simProt.chain]) {
						newValue = similarProteinBindingSitesData[dataSourceName][simProt.pdbId][simProt.chain][bindingSite.id];
					}
					res[dataSourceName][simProt.pdbId][simProt.chain][bindingSite.id] = newValue;
				}
			}
		}

		return res;
	}

	function handleQueryProteinBindingSiteToggle(dataSourceName: string, chain: string, bindingSiteId: string, show: boolean) {
		setQueryProteinBindingSitesData(prev => ({
			...prev,
			[dataSourceName]: {
				...prev[dataSourceName],
				[chain]: {
					...prev[dataSourceName][chain],
					[bindingSiteId]: show
				}
			}
		}));

		molstarWrapperRef.current?.toggleQueryProteinBindingSite(dataSourceName, chain, bindingSiteId, show);
	}

	function handleSimilarProteinBindingSiteToggle(dataSourceName: string, pdbCode: string, chain: string, bindingSiteId: string, show: boolean) {
		setSimilarProteinBindingSitesData(prev => ({
			...prev,
			[dataSourceName]: {
				...prev[dataSourceName],
				[pdbCode]: {
					...prev[dataSourceName][pdbCode],
					[chain]: {
						...prev[dataSourceName][pdbCode][chain],
						[bindingSiteId]: show
					}
				}
			}
		}));

		molstarWrapperRef.current?.toggleSimilarProteinBindingSite(dataSourceName, pdbCode, chain, bindingSiteId, show);
	}

	async function handleChainSelect(dataSourceExecutors: DataSourceExecutor[], newSelectedChain: string) {
		// Get conservation (if required)
		if (useConservation) {
			const {
				conservations: conservationsTmp,
				userFriendlyErrorMessage: conservationFetchingErrorMsg
			} = await getConservationsAPI(id, newSelectedChain);
			if (conservationFetchingErrorMsg.length > 0) {
				toastWarning(conservationFetchingErrorMsg);
				conservations.current = [];
			} else {
				conservations.current = conservationsTmp;
			}
		}

		// Prepare unaligned data (transform data to more appropriate data structures)
		prepareUnalignedDataForQueryChain(dataSourceExecutors, newSelectedChain);

		const newChainResult = alignSequences([], newSelectedChain);

		setSelectedChain(newSelectedChain);

		const queryProteinLigandsDataTmp = getQueryProteinLigandsData(newChainResult, newSelectedChain);
		setQueryProteinBindingSitesData(queryProteinLigandsDataTmp);
	}

	function handleStructuresSelect(selectedStructureOptions: StructureOption[]) {
		setSelectedStructures(selectedStructureOptions);

		const newChainResult = alignSequences(selectedStructureOptions, selectedChain);

		const similarProteinLigandDataTmp = getSimilarProteinLigandData(newChainResult, selectedStructureOptions);
		setSimilarProteinBindingSitesData(similarProteinLigandDataTmp);
	}

	/** Returns object that holds information which binding sites (and ligands if available) of query protein are displayed. */
	function getQueryProteinLigandsData(chainResult: ChainResult, selectedChain: string) {
		/* queryProteinLigandsData[dataSourceName][selectedChain][bindingSite.id] -> true/false whether binding site 
		 * (and also ligands if available) is displayed */
		const queryProteinLigandsData: Record<string, Record<string, Record<string, boolean>>> = {};

		const dseResult = chainResult.dataSourceExecutorResults;
		for (const [dataSourceName, result] of Object.entries(dseResult)) {
			for (const bindingSite of result.bindingSites) {
				if (!(dataSourceName in queryProteinLigandsData)) {
					queryProteinLigandsData[dataSourceName] = {};
				}
				if (!(selectedChain in queryProteinLigandsData[dataSourceName])) {
					queryProteinLigandsData[dataSourceName][selectedChain] = {};
				}

				let newValue = false;
				if (dataSourceName in queryProteinLigandsData
					&& selectedChain in queryProteinLigandsData[dataSourceName]
					&& bindingSite.id in queryProteinLigandsData[dataSourceName][selectedChain]) {
					newValue = queryProteinLigandsData[dataSourceName][selectedChain][bindingSite.id];
				}
				queryProteinLigandsData[dataSourceName][selectedChain][bindingSite.id] = newValue;
			}
		}

		return queryProteinLigandsData;
	}

	function handleRcsbHighlight(structureIndex: number) {
		molstarWrapperRef.current?.highlight(structureIndex);
	}

	function handleRcsbClick(structureIndex: number) {
		molstarWrapperRef.current?.focus(structureIndex);
	}

	/**
	 * Method which connects Mol* viewer activity to the RCSB plugin
	 * @param molstarPlugin Mol* plugin
	 * @param rcsbPlugin Rcsb plugin
	 * @returns void
	 */
	function linkMolstarToRcsb(molstarPlugin: PluginUIContext, rcsbPlugin: RcsbFv) {
		//cc: https://github.com/scheuerv/molart/
		function getStructureElementLoci(loci: Loci): StructureElement.Loci | undefined {
			if (loci.kind == "bond-loci") {
				return Bond.toStructureElementLoci(loci);
			} else if (loci.kind == "element-loci") {
				return loci;
			}
			return undefined;
		}

		// cc: https://github.com/scheuerv/molart/
		// listens for hover event over anything on Mol* plugin and then it determines
		// if it is loci of type StructureElement. If it is StructureElement then it
		// propagates this event from MolstarPlugin transformed as MolstarResidue.
		// in our modification it also highlights the section in RCSB viewer
		molstarPlugin.canvas3d?.interaction.hover.subscribe((event: Canvas3D.HoverEvent) => {
			const structureElementLoci = getStructureElementLoci(event.current.loci);
			if (structureElementLoci) {
				const structureElement = StructureElement.Stats.ofLoci(structureElementLoci);
				const location = structureElement.firstElementLoc;
				const molstarResidue = {
					authName: StructureProperties.atom.auth_comp_id(location),
					name: StructureProperties.atom.label_comp_id(location),
					isHet: StructureProperties.residue.hasMicroheterogeneity(location),
					insCode: StructureProperties.residue.pdbx_PDB_ins_code(location),
					index: StructureProperties.residue.key(location),
					seqNumber: StructureProperties.residue.label_seq_id(location),
					authSeqNumber: StructureProperties.residue.auth_seq_id(location),
					chain: {
						asymId: StructureProperties.chain.label_asym_id(location),
						authAsymId: StructureProperties.chain.auth_asym_id(location),
						entity: {
							entityId: StructureProperties.entity.id(location),
							index: StructureProperties.entity.key(location)
						},
						index: StructureProperties.chain.key(location)
					}
				};
				const toFind = molstarResidue.authSeqNumber;
				const structureIndices = Object.values(seqToStrMappings.current[selectedChain]);
				const positionInRcsb = structureIndices.indexOf(toFind) + 1;
				rcsbPlugin.setSelection({
					elements: {
						begin: positionInRcsb
					},
					mode: 'hover'
				});
			}
		});

		isMolstarLinkedToRcsb.current = true;
	}
}

export default AnalyticalPage;
