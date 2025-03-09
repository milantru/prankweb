import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useInterval } from "../../shared/hooks/useInterval";
import { useVisibilityChange } from "../../shared/hooks/useVisibilityChange";
import { DataStatus, getDataSourceExecutorResultAPI, getDataSourceExecutorResultStatusAPI } from "../../shared/services/apiCalls";
import RcsbSaguaro from "./components/RcsbSaguaro";

const POLLING_INTERVAL = 1000 * 5; // every 5 seconds

type SimilarSequenceAlignmentData = {
	pdbId: string; // pdb id of the similar sequence
	querySeqAlignedPartStartIdx: number;
	querySeqAlignedPartEndIdx: number;
	querySeqAlignedPart: string;
	similarSequence: string;
	similarSeqAlignedPartStartIdx: number;
	similarSeqAlignedPartEndIdx: number;
	similarSeqAlignedPart: string;
};

type Residue = {
	id: string;
	index: number; // index in related sequence
};

type UnprocessedBindingSite = {
	id: string;
	confidence: number;
	residues: Residue[];
};

type BindingSite = {
	id: string;
	confidence: number;
	residues: Record<string, number[]>; // key is id of the residue, value is index of the residue
};

export type Result = {
	id: string; // id from the IdProvider
	querySequence: string;
	bindingSites: UnprocessedBindingSite[]; // e.g. found them experimentally (1 source) or predicted (another source) 
	similarSequenceAlignmentData: SimilarSequenceAlignmentData | null;
};

type DataSourceExecutor = { // data source executor can output multiple results
	name: string;
	results: Result[];
};

type DataSourceExecutorData = {
	dataSourceName: string;
	bindingSites: BindingSite[];
	similarSequences: string[];
};

export type ProcessedResult = {
	querySequence: string;
	dataSourceExecutorsData: DataSourceExecutorData[];
};

function AnalyticalPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const id = searchParams.get("id");
	if (!id) {
		return <>No id provided.</>
	}
	// When pollingInterval is set to null, it is turned off
	const [pollingInterval, setPollingInterval] = useState<number | null>(POLLING_INTERVAL);
	const isPageVisible = useVisibilityChange();
	const dataSourceExecutors: DataSourceExecutor[] = [
		{ name: "foldseek", results: [] }
	]
	const isFetching: boolean[] = new Array(dataSourceExecutors.length).fill(false);
	const isPollingFinished: boolean[] = new Array(dataSourceExecutors.length).fill(true);
	const [processedResult, setProcessedResult] = useState<ProcessedResult | null>(null);

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

	useInterval(() => {
		async function fetchDataFromDataSource(dataSourceIndex: number) {
			isFetching[dataSourceIndex] = true;
			const {
				status,
				errorMessages: statusFetchingErrorMessages
			} = await getDataSourceExecutorResultStatusAPI(dataSourceExecutors[dataSourceIndex].name, id!);
			if (statusFetchingErrorMessages.length > 0) {
				// TODO stop polling for this data source?
				// TODO display error messages
				// TODO what about DataStatus.Failed? Maybe handle here as well as some other error?
				isFetching[dataSourceIndex] = false;
				return;
			}
			if (status !== DataStatus.Completed) {
				isFetching[dataSourceIndex] = false;
				return;
			}

			const {
				results,
				errorMessages: dataFetchingErrorMessages
			} = await getDataSourceExecutorResultAPI(dataSourceExecutors[dataSourceIndex].name, id!);
			if (dataFetchingErrorMessages.length > 0) {
				// TODO Maybe handle/display error messages somehow?
				isPollingFinished[dataSourceIndex] = true;
				if (isPollingFinished.every(x => x)) {
					setPollingInterval(null);
				}
				isFetching[dataSourceIndex] = false;
				return;
			}

			dataSourceExecutors[dataSourceIndex].results = results;
			// Data was received, its state won't change, so polling is not required anymore
			isPollingFinished[dataSourceIndex] = true;
			if (isPollingFinished.every(x => x)) {
				setPollingInterval(null);

				setProcessedResult(alignSequences(dataSourceExecutors));
				dataSourceExecutors.forEach(dse => dse.results = []); // Free space (data has been processed and stored, we don't need this anymore)
			}
			isFetching[dataSourceIndex] = false;
		}

		for (let dataSourceExecutorIdx = 0; dataSourceExecutorIdx < dataSourceExecutors.length; dataSourceExecutorIdx++) {
			if (isFetching[dataSourceExecutorIdx]) {
				continue;
			}
			fetchDataFromDataSource(dataSourceExecutorIdx);
		}
	}, pollingInterval);


	return (
		<div id="analyze" className="display-none row">
			<div id="visualization" className="col-xs-12 col-md-7 col-xl-7">
				<div id="application-rcsb">
					{processedResult && (
						<RcsbSaguaro processedResult={processedResult} />
					)}
				</div>
			</div>
			<div id="information" className="col-xs-12 col-md-5 col-xl-5">
				<div id="pocket-list-aside">
					<div id="application-molstar">
						Mol*
					</div>
					<div id="visualization-toolbox">asda</div>
				</div>
			</div>
		</div>
	);

	function replaceWithAlignedPart(
		sequence: string,
		alignedPartStartIdx: number,
		alignedPartEndtIdx: number,
		alignedPart: string
	) {
		const startPart = sequence.slice(0, alignedPartStartIdx);
		const endPart = sequence.slice(alignedPartEndtIdx);

		return startPart + alignedPart + endPart;
	}

	function createMapping(sequence: string, sequenceWithGaps: string) {
		// key: idx in original seq (without gaps), value: idx in query seq with gaps
		const mapping: Record<number, number> = {};

		for (let i = 0, j = 0; i < sequence.length; i++, j++) {
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

	function updateBindingSiteResiduesIndices(bindingSite: UnprocessedBindingSite, mapping: Record<number, number>) {
		bindingSite.residues.forEach(r =>
			r.index = mapping[r.index]
		)
	}
	
	function alignQueryAndSimilarSequence(result: Result): Result {
		if (result.similarSequenceAlignmentData === null) {
			return result;
		}

		let querySeq = replaceWithAlignedPart(
			result.querySequence,
			result.similarSequenceAlignmentData.querySeqAlignedPartStartIdx,
			result.similarSequenceAlignmentData.querySeqAlignedPartEndIdx,
			result.similarSequenceAlignmentData.querySeqAlignedPart
		);
		let similarSeq = replaceWithAlignedPart(
			result.similarSequenceAlignmentData.similarSequence,
			result.similarSequenceAlignmentData.similarSeqAlignedPartStartIdx,
			result.similarSequenceAlignmentData.similarSeqAlignedPartEndIdx,
			result.similarSequenceAlignmentData.similarSeqAlignedPart
		);
		const querySeqAlignedPartStartIdx = result.similarSequenceAlignmentData.querySeqAlignedPartStartIdx;
		const targetSeqAlignedPartStartIdx = result.similarSequenceAlignmentData.similarSeqAlignedPartStartIdx;

		/* Pad the beginning of the sequence with the smaller start index  
		* to align the start indices of both sequences. */
		if (querySeqAlignedPartStartIdx < targetSeqAlignedPartStartIdx) {
			const gapCount = targetSeqAlignedPartStartIdx - querySeqAlignedPartStartIdx;
			querySeq = querySeq.padStart(querySeq.length + gapCount, "-");
			result.similarSequenceAlignmentData.querySeqAlignedPartStartIdx += gapCount;
		} else {
			const gapCount = querySeqAlignedPartStartIdx - targetSeqAlignedPartStartIdx;
			similarSeq = similarSeq.padStart(similarSeq.length + gapCount, "-");
			result.similarSequenceAlignmentData.similarSeqAlignedPartStartIdx += gapCount;
		}

		// Pad the shorter sequence to match the length of the longer one.
		if (querySeq.length < similarSeq.length) {
			const gapCount = similarSeq.length - querySeq.length;
			similarSeq = querySeq.padEnd(querySeq.length + gapCount, "-");
		} else {
			const gapCount = querySeq.length - similarSeq.length;
			similarSeq = similarSeq.padEnd(similarSeq.length + gapCount, "-");
		}

		// Update all residue indices of each result bindig site
		const mapping = createMapping(result.querySequence, querySeq);
		result.bindingSites.forEach(bindingSite => 
			updateBindingSiteResiduesIndices(bindingSite, mapping));

		result.querySequence = querySeq;
		result.similarSequenceAlignmentData.similarSequence = similarSeq;
		return result;
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

	function alignSequences(dataSourceExecutors: DataSourceExecutor[]): ProcessedResult {
		if (dataSourceExecutors.length == 0 || dataSourceExecutors[0].results.length == 0) {
			return { querySequence: "", dataSourceExecutorsData: [] };
		}

		/* "Preprocessing phase": Align query and similar sequences while also updating binding site indices.
		 * Results without similar sequences are skipped (unchanged). */
		dataSourceExecutors.forEach(dse =>
			dse.results = dse.results.map(res => alignQueryAndSimilarSequence(res)));

		/* "Merge phase": Create master query sequence and align other sequences and binding sites to it.
		 * Master query sequence is query sequence on which every similar sequence and binding site can be aligned with/mapped to. */
		let masterQuerySeq = "";
		const similarSeqResults: string[][] = new Array(dataSourceExecutors.length);
		dataSourceExecutors.forEach((dse, dseIdx) => similarSeqResults[dseIdx] = new Array(dse.results.length).fill(""));
		// const bindingSiteResults: BindingSite[][][] = new Array(dataSourceExecutors.length);
		// dataSourceExecutors.forEach((dse, dseIdx) => similarSeqResults[dseIdx] = new Array(dse.results.length).fill([]));

		// Length of the query sequence (sequence with no gaps)
		const querySeqLength = getQuerySeqLength(dataSourceExecutors[0].results[0].querySequence);

		const offsets: number[][] = new Array(dataSourceExecutors.length);
		dataSourceExecutors.forEach((dse, dseIdx) => offsets[dseIdx] = new Array(dse.results.length).fill(0));

		const mapping: Record<number, number>[][] = new Array(dataSourceExecutors.length);
		mapping.forEach((m, dseIdx) => m[dseIdx] = new Array(dataSourceExecutors[dseIdx].results.length).fill({}))

		for (let aminoAcidIdx = 0; aminoAcidIdx < querySeqLength; aminoAcidIdx++) {
			const isGapMode = dataSourceExecutors.some((dse, dseIdx) =>
				dse.results.some((res, resIdx) => res.querySequence[aminoAcidIdx + offsets[dseIdx][resIdx]] === '-'));

			let aminoAcidOfQuerySeq: string = null!;
			for (let dataSourceExecutorIdx = 0; dataSourceExecutorIdx < dataSourceExecutors.length; dataSourceExecutorIdx++) {
				const dataSourceExecutor = dataSourceExecutors[dataSourceExecutorIdx];
				for (let resultIdx = 0; resultIdx < dataSourceExecutor.results.length; resultIdx++) {
					const result = dataSourceExecutor.results[resultIdx];
					/* Master query sequence is being built iteratively character by character (that is why we can use masterQuerySeq.length 
					 * to point to the newest character). This variable points to the current character (amino acid) of master query sequence 
					 * that will be outputted/added later in code. And because it will be added later + 1 is used here. */
					const aminoAcidOfMasterQuerySeqCurrIdx = masterQuerySeq.length + 1;
					if (result.similarSequenceAlignmentData === null) {
						mapping[dataSourceExecutorIdx][resultIdx][aminoAcidIdx] = aminoAcidOfMasterQuerySeqCurrIdx;
						continue;
					}
					const offset = offsets[dataSourceExecutorIdx][resultIdx];

					const aminoAcidOrGapOfQuerySeq = result.querySequence[aminoAcidIdx + offset];
					if (isGapMode) {
						if (aminoAcidOrGapOfQuerySeq === '-') {
							similarSeqResults[dataSourceExecutorIdx][resultIdx] = similarSeqResults[dataSourceExecutorIdx][resultIdx] + result.similarSequenceAlignmentData.similarSequence[aminoAcidIdx + offset];
							mapping[dataSourceExecutorIdx][resultIdx][aminoAcidIdx + offset] = aminoAcidOfMasterQuerySeqCurrIdx;
							offsets[dataSourceExecutorIdx][resultIdx] = offset + 1;
						} else {
							similarSeqResults[dataSourceExecutorIdx][resultIdx] = similarSeqResults[dataSourceExecutorIdx][resultIdx] + '-';
						}
					} else {
						/* All of the results have the same query sequence (if we ignore gaps). On the (aminoAcidIdx + offset) index
						* is the same amino acid for all the results, which means that here is (for all of the results)
						* always assigned the same amino acid. Which might seem odd (that we keep reassigning the same value),
						* but it is correct and to avoid further program branching it will be left like this. */
						aminoAcidOfQuerySeq = aminoAcidOrGapOfQuerySeq;
						similarSeqResults[dataSourceExecutorIdx][resultIdx] = similarSeqResults[dataSourceExecutorIdx][resultIdx] + result.similarSequenceAlignmentData.similarSequence[aminoAcidIdx + offset];
						mapping[dataSourceExecutorIdx][resultIdx][aminoAcidIdx + offset] = aminoAcidOfMasterQuerySeqCurrIdx;
					}
				}
			}

			if (isGapMode) {
				masterQuerySeq = masterQuerySeq + '-';
				aminoAcidIdx--; // Sequences with gaps where shifted, repeat for the same amino acid
			} else {
				masterQuerySeq = masterQuerySeq + aminoAcidOfQuerySeq;
			}
		}

		const bindingSiteResults: BindingSite[][] = new Array(dataSourceExecutors.length).fill([]);
		// Update all residue indices of each binding site, map binding sites to proper type and store them to return them later
		dataSourceExecutors.forEach((dse, dseIdx) =>
			dse.results.forEach((res, resIdx) => {
				res.bindingSites.forEach(bindingSite => updateBindingSiteResiduesIndices(bindingSite, mapping[dseIdx][resIdx]));
				
				const bindingSites: BindingSite[] = res.bindingSites.map<BindingSite>(bindingSite => {
					const residues: Record<string, number[]> = {};
					bindingSite.residues.forEach(r => {
						if (/* TODO add condition: key r.id does not exist in residues */) {
							residues[r.id] = [];
						}
						residues[r.id].push(r.index); 
					});
					// TODO implement: sort residues by indices, ascending (in-place is possible)
					return {id: bindingSite.id, confidence: bindingSite.confidence, residues: residues};
				});

				bindingSiteResults[dseIdx].push(...bindingSites);
			})
		);

		const dataSourceExecutorsData: DataSourceExecutorData[] = dataSourceExecutors.map<DataSourceExecutorData>((dse, dseIdx) => ({
			dataSourceName: dse.name,
			bindingSites: bindingSiteResults[dseIdx],
			similarSequences: similarSeqResults[dseIdx]
		}));
		return { querySequence: masterQuerySeq, dataSourceExecutorsData };
	}
}

export default AnalyticalPage;
