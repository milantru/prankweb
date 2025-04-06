import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useInterval } from "../../shared/hooks/useInterval";
import { useVisibilityChange } from "../../shared/hooks/useVisibilityChange";
import { DataStatus, getAllChainsAPI, getConservationsAPI, getDataSourceExecutorResultAPI, getDataSourceExecutorResultStatusAPI } from "../../shared/services/apiCalls";
import RcsbSaguaro from "./components/RcsbSaguaro";
import { FadeLoader } from "react-spinners";
import { MolStarWrapper } from "./components/MolstarWrapper";
import { toastWarning } from "../../shared/helperFunctions/toasts";
import ErrorMessageBox from "./components/ErrorMessageBox";
import { sanitizeCode, sanitizeSequence } from "../../shared/helperFunctions/validation";
import Select from 'react-select';

const POLLING_INTERVAL = 1000 * 5; // every 5 seconds

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

export type BindingSite = {
	id: string;
	confidence: number;
	residues: number[]; // sequence indices
};

type UnprocessedSimilarProtein = {
	pdbId: string; // pdb id of the similar sequence
	sequence: string;
	chain: string;
	bindingSites: BindingSite[];
	alignmentData: AlignmentData;
};

type Metadata = {
	dataSource: string;
	timestamp: Date;
};

export type UnprocessedResult = {
	id: string; // id from the IdProvider
	// TODO pdbId nebude pre query?
	sequence: string; // query sequence
	chain: string;
	pdbUrl: string;
	bindingSites: BindingSite[]; // e.g. found them experimentally (1 source) or predicted (another source) 
	similarProteins: UnprocessedSimilarProtein[] | null;
	metadata: Metadata;
};

type DataSourceExecutor = {
	name: string;
	// one result for each chain (here will be stored results from data source executors temporarily until all are fetched)
	results: UnprocessedResult[];
};

type SimilarProtein = {
	pdbId: string;
	// pdbUrl: string; // TODO tu netreba?
	sequence: string;
	chain: string;
	bindingSites: BindingSite[];
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

type DataSourceExecutorResult = Record<string, ProcessedResult>;

export type ChainResult = {
	querySequence: string,
	dataSourceExecutorResults: DataSourceExecutorResult;
	conservations: Conservation[];
};

export type ChainResults = Record<string, ChainResult>;

function AnalyticalPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const id = searchParams.get("id");
	if (!id) {
		return <>No id provided.</>
	}
	let chains = searchParams.get("chains")
		? searchParams.get("chains").split(",").filter(x => x.length > 0)
		: []; // When no chains are selected by the user, we select all of them (we fetch all chains later when fetching results)
	const useConservation = searchParams.get("useConservation")?.toLowerCase() === "true";
	// When pollingInterval is set to null, it is turned off (initially it's turned off, it will be turned on after component loading)
	const [pollingInterval, setPollingInterval] = useState<number | null>(null);
	const isPageVisible = useVisibilityChange();
	const dataSourceExecutors: DataSourceExecutor[] = [
		{ name: "p2rank", results: [] },
		{ name: "foldseek", results: [] }
	]
	const isFetching: boolean[] = new Array(dataSourceExecutors.length).fill(false);
	const isPollingFinished: boolean[] = new Array(dataSourceExecutors.length).fill(true);
	const [errorMessages, setErrorMessages] = useState<string[]>(new Array(dataSourceExecutors.length).fill(""));
	const [chainResults, setChainResults] = useState<ChainResults | null>(null);
	const [selectedChain, setSelectedChain] = useState<string>(null!); // Will be set when chain results are set

	useEffect(() => {
		if (isPollingFinished.every(x => x)) {
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
		for (let dataSourceExecutorIdx = 0; dataSourceExecutorIdx < dataSourceExecutors.length; dataSourceExecutorIdx++) {
			fetchDataFromDataSource(dataSourceExecutorIdx);
		}

		setPollingInterval(POLLING_INTERVAL); // turn on the polling
	}, []);

	useInterval(() => {
		for (let dataSourceExecutorIdx = 0; dataSourceExecutorIdx < dataSourceExecutors.length; dataSourceExecutorIdx++) {
			if (isFetching[dataSourceExecutorIdx]) {
				continue;
			}
			fetchDataFromDataSource(dataSourceExecutorIdx);
		}
	}, pollingInterval);

	return (
		<div>
			{errorMessages.some(errMsg => errMsg.length > 0) && (
				<ErrorMessageBox errorMessages={errorMessages} onClose={clearErrorMessages} />
			)}

			<div id="visualizations" className="row">
				<div id="visualization-rcsb" className="col-xs-12 col-md-6 col-xl-6">
					{chainResults !== null ? (
						// TODO sprav cely panel, viacej moznosti sa budu dat vyberat asi v buducnosti napr checkbox pre merge binding sitov
						<div className="d-flex flex-column ">
							<div className="position-absolute w-25 d-flex align-items-center justify-content-center">
								<div className="mr-1 font-weight-bold">Chains:</div>
								<Select
									defaultValue={{ label: Object.keys(chainResults)[0], chain: Object.keys(chainResults)[0] }}
									onChange={(selectedOption: any) => setSelectedChain(selectedOption.value)}
									/* as any is used here to silence error message which seems to be irrelevant, it says
									* the type is wrong but according to the official GitHub repo README of the package,
									* this is how options should look like, so it should be OK. */
									options={Object.keys(chainResults).map(chain => ({
										label: chain,
										value: chain
									})) as any} />
							</div>
							<div className="w-100 mt-2">
								<RcsbSaguaro chainResult={chainResults[selectedChain]} />
							</div>
						</div>
					) : (
						<div className="d-flex py-2 justify-content-center align-items-center">
							<FadeLoader color="#c3c3c3" />
						</div>
					)}
				</div>
				<div id="visualization-molstar" className="col-xs-12 col-md-6 col-xl-6">
					<MolStarWrapper />
					<div id="visualization-toolbox">TODO Toolbox</div>
				</div>
			</div>
		</div>
	);

	async function fetchDataFromDataSource(dataSourceIndex: number) {
		console.log("Polling data source executor: " + dataSourceExecutors[dataSourceIndex].name);
		isFetching[dataSourceIndex] = true;
		const {
			status,
			userFriendlyErrorMessage: statusFetchingErrorMessage
		} = await getDataSourceExecutorResultStatusAPI(dataSourceExecutors[dataSourceIndex].name, id);
		if (statusFetchingErrorMessage.length > 0) {
			console.warn(statusFetchingErrorMessage + "\nRetrying...");
			isFetching[dataSourceIndex] = false;
			return;
		}
		console.log("Status:" + status)

		if (chains.length === 0) {
			/* Every protein has at least one chain. No chains means none was selected by the user so we select all.
			 * When status is ready, the chains.json (on the server, containing all the chains) should be ready as well,
			 * so if we don't have the chains, we can get all of them from it. */
			const { chains: chainsTmp, userFriendlyErrorMessage: allChainsFetchingErrorMessage } = await getAllChainsAPI(id);
			if (allChainsFetchingErrorMessage.length > 0) {
				toastWarning(allChainsFetchingErrorMessage + "\nRetrying...");
				return;
			}
			chains = chainsTmp;
		}

		if (status === DataStatus.Processing) {
			isFetching[dataSourceIndex] = false;
			return;
		}

		if (status === DataStatus.Failed) {
			const errMsg = `Failed to fetch data from ${dataSourceExecutors[dataSourceIndex].name}, so they won't be displayed.`;
			updateErrorMessages(dataSourceIndex, errMsg);
		} else if (status === DataStatus.Completed) {
			const results: UnprocessedResult[] = [];

			for (let i = 0; i < chains.length; i++) {
				const chain = chains[i];

				const {
					result,
					userFriendlyErrorMessage: dataFetchingErrorMessage
				} = await getDataSourceExecutorResultAPI(dataSourceExecutors[dataSourceIndex].name, id, chain, useConservation);
				if (dataFetchingErrorMessage.length > 0) {
					toastWarning(dataFetchingErrorMessage + "\nRetrying...");
					i--; // Try again for the same chain
					continue;
				}
				results.push(result);
			}

			console.log("Results:" + results)
			dataSourceExecutors[dataSourceIndex].results = results;
		} else {
			throw new Error("Unknown status."); // This should never happen.
		}

		/* Either was processing successful and we got the result (Status.Completed),
		 * or it failed and we won't get result ever (Status.Failed). This means polling for this
		 * data source result is not required anymore, and we can stop it. */
		isPollingFinished[dataSourceIndex] = true;
		if (isPollingFinished.every(x => x)) {
			setPollingInterval(null); // turn off polling entirely (for all data sources)

			// TODO zmen nazvy refactor
			const allResults = dataSourceExecutors.flatMap(x => x.results);
			const chainUnprocessedResults = transform(allResults);
			const chainResultsTmp: ChainResults = {};
			for (const [chain, dataSourceResults] of Object.entries(chainUnprocessedResults)) {
				const { conservations, userFriendlyErrorMessage } = await getConservationsAPI(id, chain);
				if (userFriendlyErrorMessage.length > 0) {
					// TODO err msg meno zmen + handle error + mozno tie chainy aj skor moze celkovo rychlejsie sa asi da preco awaitujes po jednom? aj resulty aj chainy
				}
				chainResultsTmp[chain] = await alignSequencesAcrossAllDataSources(dataSourceResults, conservations);
			}
			setChainResults(chainResultsTmp);
			setSelectedChain(chains[0]) // Every protein has at least 1 chain
		}
		isFetching[dataSourceIndex] = false;
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
			bindingSite.residues[i] = mapping[bindingSite.residues[i]];
		}
	}

	function alignQueryAndSimilarSequence(querySequence: string, similarProtein: UnprocessedSimilarProtein) {
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
		const mapping = createMapping(querySequence, querySeq);
		similarProtein.bindingSites.forEach(bindingSite =>
			updateBindingSiteResiduesIndices(bindingSite, mapping));

		// Update with aligned query and similar seq
		similarProtein.alignmentData.querySequence = querySeq;
		similarProtein.alignmentData.similarSequence = similarSeq;
	}

	function getQuerySeqLength(querySeqWithGaps: string) {
		let counter = 0;

		for (const c of querySeqWithGaps) {
			if (c !== '-') {
				counter++;
			}
		}

		return counter;
	}

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

	function alignSequencesAcrossAllDataSources(
		unprocessedResultPerDataSourceExecutor: Record<string, UnprocessedResult>,
		conservations: Conservation[]
	): ChainResult {
		const dataSourceExecutorsCount = Object.keys(unprocessedResultPerDataSourceExecutor).length;
		if (dataSourceExecutorsCount == 0) {
			// if we dont have any result from any data source executor, then we have nothing to align
			return { querySequence: "", dataSourceExecutorResults: {}, conservations: [] };
			// return dataSourceExecutorsResults; // TODO asi skor toto vrat potom
		}
		// TODO what if we have data source executor results but no with sim prots? Maybe add if?

		/* "Preprocessing phase": Align query and similar sequences while also updating binding site indices.
		 * Results without similar sequences are skipped (unchanged). */
		for (const unprocessedResult of Object.values(unprocessedResultPerDataSourceExecutor)) {
			if (!unprocessedResult.similarProteins) {
				continue;
			}
			const querySeq = unprocessedResult.sequence;
			// Creates pairs of query seq and similar seq and aligns them (updates using reference) 
			unprocessedResult.similarProteins.forEach(simProt => alignQueryAndSimilarSequence(querySeq, simProt));
		}

		/* "Merge phase": Create master query sequence and align other sequences and binding sites to it.
		 * Master query sequence is query sequence on which every similar sequence and binding site can be aligned with/mapped to. */
		let masterQuerySeq = "";
		const similarProteins: Record<string, SimilarProtein[]> = {};
		for (const [dataSourceName, result] of Object.entries(unprocessedResultPerDataSourceExecutor)) {
			if (!result.similarProteins) {
				continue;
			}
			similarProteins[dataSourceName] = result.similarProteins.map<SimilarProtein>(simProt => ({
				pdbId: sanitizeCode(simProt.pdbId),
				chain: sanitizeSequence(simProt.chain),
				bindingSites: simProt.bindingSites,
				sequence: "" // will be set later when aligning
			}));
		}

		// TODO mozno zmat getQuerySeqLength aj ten riadok cely: const querySeqLength = getQuerySeqLength(dataSourceExecutors[0].results[0].sequence);
		const querySeq = Object.values(unprocessedResultPerDataSourceExecutor)[0].sequence;
		const querySeqLength = querySeq.length; // Length of the query sequence (sequence with no gaps)

		const offsets: Record<string, number[]> = {};
		for (const [dataSourceName, result] of Object.entries(unprocessedResultPerDataSourceExecutor)) {
			if (!result.similarProteins) {
				continue;
			}
			offsets[dataSourceName] = new Array(result.similarProteins.length).fill(0);
		}

		/* Now we are going to create 2 mappings: A and B. A is for general mapping from query sequence
		 * to master query sequence which we are going to create (that's the one at the top of the sequence display).
		 * we can use it e.g. to map residues of predicated binding sites of query sequence.
		 * The other mapping is for mapping simialr proteins to master query protein. It can be used e.g. to map
		 * binding sites of similar proteins to master query sequence. We need this separate mapping because
		 * binding site of similar protein is related to that similar protein, to its amino acid positions,
		 * and we are going to do the aligning now. So their (similar protein amino acids) indices 
		 * are going to change. So we need to know from which amino acid of similar sequence 
		 * we are mapping to which master query amino acid. */
		// mapping A: mapping[dataSourceName][idxFrom] -> idxTo
		const mapping: Record<string, Record<number, number>> = {};
		// mapping B: similarProteinsMapping[dataSourceName][simProtIdx][idxFrom] -> idxTo
		const similarProteinsMapping: Record<string, Record<number, number>[]> = {};
		for (const [dataSourceName, result] of Object.entries(unprocessedResultPerDataSourceExecutor)) {
			mapping[dataSourceName] = {};

			if (result.similarProteins) {
				similarProteinsMapping[dataSourceName] = Array.from(
					{ length: result.similarProteins.length },
					(): Record<number, number> => ({})
				);
			}
		};

		for (let aminoAcidIdx = 0; aminoAcidIdx < querySeqLength; aminoAcidIdx++) {
			const isGapMode = Object.entries(unprocessedResultPerDataSourceExecutor).some(([dataSourceName, result]) =>
				result.similarProteins && result.similarProteins.some((simProt, simProtIdx) =>
					simProt.alignmentData.querySequence[aminoAcidIdx + offsets[dataSourceName][simProtIdx]] === '-')
			);

			let aminoAcidOfQuerySeq: string = null!;
			/* Master query sequence is being built iteratively character by character,
			 * that is why we can use masterQuerySeq.length to point to the newest character.
			 * This variable holds index of the current character (amino acid or gap) of
			 * master query sequence that will be outputted/added later in code. */
			const aminoAcidOrGapOfMasterQuerySeqCurrIdx = masterQuerySeq.length;
			for (const [dataSourceName, result] of Object.entries(unprocessedResultPerDataSourceExecutor)) {
				/* We will overwrite many times with the same value, but it is correct and to reduce cycles 
				 * and branching, it will remain like this. */
				mapping[dataSourceName][aminoAcidIdx] = aminoAcidOrGapOfMasterQuerySeqCurrIdx;

				if (!result.similarProteins) {
					continue;
				}
				for (let simProtIdx = 0; simProtIdx < result.similarProteins.length; simProtIdx++) {
					const similarProtein = result.similarProteins[simProtIdx];
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

		// "Postprocessing phase": Update all residue indices of each binding site
		Object.entries(unprocessedResultPerDataSourceExecutor).forEach(([dataSourceName, result]) => {
			// Update residues of binding sites of query protein
			result.bindingSites.forEach(bindingSite =>
				updateBindingSiteResiduesIndices(bindingSite, mapping[dataSourceName]));

			if (result.similarProteins) {
				// Update residues of binding sites of all similar proteins
				result.similarProteins.forEach((simProt, simProtIdx) =>
					simProt.bindingSites.forEach(bindingSite =>
						updateBindingSiteResiduesIndices(bindingSite, similarProteinsMapping[dataSourceName][simProtIdx])));
			}
		});
		for (const conservation of conservations) {
			// TODO mapping asi len jeden staci pre horne binding sity
			conservation.index = mapping["foldseek"][conservation.index];
		}

		const dataSourceExecutorResultsTmp: Record<string, ProcessedResult> = {};
		Object.entries(unprocessedResultPerDataSourceExecutor).forEach(([dataSourceName, result]) =>
			dataSourceExecutorResultsTmp[dataSourceName] = {
				pdbUrl: result.pdbUrl,
				bindingSites: result.bindingSites,
				similarProteins: similarProteins[dataSourceName]
			}
		);
		return { querySequence: masterQuerySeq, dataSourceExecutorResults: dataSourceExecutorResultsTmp, conservations: conservations };
	}

	function updateErrorMessages(dataSourceIndex: number, errorMessage: string) {
		const updatedErrorMessages = [...errorMessages];
		updatedErrorMessages[dataSourceIndex] = errorMessage;
		setErrorMessages(updatedErrorMessages);
	};

	function clearErrorMessages() {
		setErrorMessages(new Array(dataSourceExecutors.length).fill(""));
	}
}

export default AnalyticalPage;
