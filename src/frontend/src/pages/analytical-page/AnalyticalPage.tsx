import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useInterval } from "../../shared/hooks/useInterval";
import { useVisibilityChange } from "../../shared/hooks/useVisibilityChange";
import { DataStatus, getDataSourceExecutorResultAPI, getDataSourceExecutorResultStatusAPI } from "../../shared/services/apiCalls";
import RcsbSaguaro from "./components/RcsbSaguaro";
import { FadeLoader } from "react-spinners";
import { toastWarning } from "../../shared/helperFunctions/toasts";
import ErrorMessageBox from "./components/ErrorMessageBox";

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
	name: string;
	seqIndex: number; // index in related sequence
};

type UnprocessedBindingSite = {
	id: string;
	confidence: number;
	residues: Residue[];
};

export type BindingSite = {
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

type SimilarSequence = {
	label: string;
	sequence: string;
};

type DataSourceExecutorData = {
	dataSourceName: string;
	bindingSites: BindingSite[][];
	similarSequences: SimilarSequence[];
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
	// When pollingInterval is set to null, it is turned off (initially turned off, will be turned on after component loading)
	const [pollingInterval, setPollingInterval] = useState<number | null>(null);
	const isPageVisible = useVisibilityChange();
	const dataSourceExecutors: DataSourceExecutor[] = [
		{ name: "foldseek", results: [] }
	]
	const isFetching: boolean[] = new Array(dataSourceExecutors.length).fill(false);
	const isPollingFinished: boolean[] = new Array(dataSourceExecutors.length).fill(true);
	const [errorMessages, setErrorMessages] = useState<string[]>(new Array(dataSourceExecutors.length).fill(""));
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

			<div id="analyze" className="row">
			<div id="visualization" className="col-xs-12 col-md-6 col-xl-6">
				<div id="application-rcsb">
					{processedResult !== null ? (
						<RcsbSaguaro processedResult={processedResult} />
					) : (
						<div className="d-flex py-2 justify-content-center align-items-center">
							<FadeLoader color="#c3c3c3" />
						</div>
					)}
				</div>
			</div>
			<div id="information" className="col-xs-12 col-md-6 col-xl-6">
				<div id="pocket-list-aside">
					<div id="application-molstar">
						Mol*
					</div>
					<div id="visualization-toolbox">asda</div>
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
			toastWarning(statusFetchingErrorMessage + "\nRetrying...");
			isFetching[dataSourceIndex] = false;
			return;
		}
		console.log("Status:" + status)
		if (status === DataStatus.Processing) {
			isFetching[dataSourceIndex] = false;
			return;
		}

		if (status === DataStatus.Failed) {
			const errMsg = `Failed to fetch data from ${dataSourceExecutors[dataSourceIndex].name}, so they won't be displayed.`;
			updateErrorMessages(dataSourceIndex, errMsg);
		} else if (status === DataStatus.Completed) {
		const {
			results,
				userFriendlyErrorMessage: dataFetchingErrorMessage
			} = await getDataSourceExecutorResultAPI(dataSourceExecutors[dataSourceIndex].name, id);
			if (dataFetchingErrorMessage.length > 0) {
				toastWarning(dataFetchingErrorMessage + "\nRetrying...");
			isFetching[dataSourceIndex] = false;
			return;
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

			setProcessedResult(await alignSequences(dataSourceExecutors));
			dataSourceExecutors.forEach(dse => dse.results = []); // Free space (data has been processed and stored, we don't need this anymore)
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
			r.seqIndex = mapping[r.seqIndex]
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

	async function alignSequences(dataSourceExecutors: DataSourceExecutor[]): Promise<ProcessedResult> {
		if (dataSourceExecutors.length == 0 || dataSourceExecutors[0].results.length == 0) {
			return { querySequence: "", dataSourceExecutorsData: [] };
		}

		/* "Preprocessing phase": Align query and similar sequences while also updating binding site indices.
		 * Results without similar sequences are skipped (unchanged). */
		await Promise.all(
			dataSourceExecutors.map(dse =>
				new Promise<void>(resolve => {
					dse.results = dse.results.map(res => alignQueryAndSimilarSequence(res));
					resolve();
				})
			)
		);

		/* "Merge phase": Create master query sequence and align other sequences and binding sites to it.
		 * Master query sequence is query sequence on which every similar sequence and binding site can be aligned with/mapped to. */
		let masterQuerySeq = "";
		const similarSeqResults: SimilarSequence[][] = Array.from(
			{ length: dataSourceExecutors.length },
			() => []
		);
		dataSourceExecutors.forEach((dse, dseIdx) => {
			similarSeqResults[dseIdx] = Array.from(
				{ length: dse.results.length },
				(): SimilarSequence => ({ label: "", sequence: "" })
			);
		});

		// Length of the query sequence (sequence with no gaps)
		const querySeqLength = getQuerySeqLength(dataSourceExecutors[0].results[0].querySequence);

		const offsets: number[][] = Array.from(
			{ length: dataSourceExecutors.length },
			() => []
		);
		dataSourceExecutors.forEach((dse, dseIdx) => {
			offsets[dseIdx] = Array(dse.results.length).fill(0);
		});

		const mapping: Record<number, number>[][] = Array.from(
			{ length: dataSourceExecutors.length },
			() => []
		);
		dataSourceExecutors.forEach((executor, dseIdx) => {
			mapping[dseIdx] = Array.from(
				{ length: executor.results.length },
				() => ({})
			);
		});

		for (let aminoAcidIdx = 0; aminoAcidIdx < querySeqLength; aminoAcidIdx++) {
			const isGapMode = dataSourceExecutors.some((dse, dseIdx) =>
				dse.results.some((res, resIdx) => res.querySequence[aminoAcidIdx + offsets[dseIdx][resIdx]] === '-'));

			const tasks = [];
			let aminoAcidOfQuerySeq: string = null!;
			for (let dataSourceExecutorIdx = 0; dataSourceExecutorIdx < dataSourceExecutors.length; dataSourceExecutorIdx++) {
				const dataSourceExecutor = dataSourceExecutors[dataSourceExecutorIdx];
				for (let resultIdx = 0; resultIdx < dataSourceExecutor.results.length; resultIdx++) {
					const task = new Promise<void>(resolve => {
						const result = dataSourceExecutor.results[resultIdx];
						/* Master query sequence is being built iteratively character by character,
						 * that is why we can use masterQuerySeq.length to point to the newest character.
						 * This variable holds index of the current character (amino acid or gap) of
						 * master query sequence that will be outputted/added later in code. */
						const aminoAcidOrGapOfMasterQuerySeqCurrIdx = masterQuerySeq.length;
						if (result.similarSequenceAlignmentData === null) {
							mapping[dataSourceExecutorIdx][resultIdx][aminoAcidIdx] = aminoAcidOrGapOfMasterQuerySeqCurrIdx;
							resolve();
							return;
						}
						const offset = offsets[dataSourceExecutorIdx][resultIdx];
						/* In the first iteration we set the label and in the following iterations we overwrite it with the same value.
						 * It might seem odd, but it is correct. And to avoid further program branching, it will remain like this. */
						similarSeqResults[dataSourceExecutorIdx][resultIdx].label = result.similarSequenceAlignmentData.pdbId;

						const aminoAcidOrGapOfQuerySeq = result.querySequence[aminoAcidIdx + offset];
						if (isGapMode) {
							if (aminoAcidOrGapOfQuerySeq === '-') {
								similarSeqResults[dataSourceExecutorIdx][resultIdx].sequence += result.similarSequenceAlignmentData.similarSequence[aminoAcidIdx + offset];
								mapping[dataSourceExecutorIdx][resultIdx][aminoAcidIdx + offset] = aminoAcidOrGapOfMasterQuerySeqCurrIdx;
								offsets[dataSourceExecutorIdx][resultIdx] = offset + 1;
							} else {
								similarSeqResults[dataSourceExecutorIdx][resultIdx].sequence += '-';
							}
						} else {
							/* All of the results have the same query sequence (if we ignore gaps). On the (aminoAcidIdx + offset) index
							* is the same amino acid for all the results, which means that here is (for all of the results)
							* always assigned the same amino acid. Which might seem odd (that we keep reassigning the same value),
							* but it is correct and to avoid further program branching it will be left like this. */
							aminoAcidOfQuerySeq = aminoAcidOrGapOfQuerySeq;
							similarSeqResults[dataSourceExecutorIdx][resultIdx].sequence += result.similarSequenceAlignmentData.similarSequence[aminoAcidIdx + offset];
							mapping[dataSourceExecutorIdx][resultIdx][aminoAcidIdx + offset] = aminoAcidOrGapOfMasterQuerySeqCurrIdx;
						}

						resolve();
					});

					tasks.push(task);
				}
			}

			await Promise.all(tasks);

			if (isGapMode) {
				masterQuerySeq += '-';
				aminoAcidIdx--; // Sequences with gaps where shifted, repeat for the same amino acid
			} else {
				masterQuerySeq += aminoAcidOfQuerySeq;
			}
		}

		const bindingSiteResults: BindingSite[][][] = Array.from(
			{ length: dataSourceExecutors.length },
			() => []
		);
		bindingSiteResults.forEach((_, dseIdx) => {
			bindingSiteResults[dseIdx] = Array.from(
				{ length: dataSourceExecutors[dseIdx].results.length },
				() => []
			);
		});
		// Update all residue indices of each binding site, map binding sites to proper type and store them to return them later
		const tasks = [];
		dataSourceExecutors.forEach((dse, dseIdx) =>
			dse.results.forEach((res, resIdx) => {
				const task = new Promise<void>(resolve => {
					res.bindingSites.forEach(bindingSite => updateBindingSiteResiduesIndices(bindingSite, mapping[dseIdx][resIdx]));

					const bindingSites: BindingSite[] = res.bindingSites.map<BindingSite>(bindingSite => {
						const residues: Record<string, number[]> = {};
						bindingSite.residues.forEach(r => {
							if (!(r.name in residues)) {
								residues[r.name] = [];
							}
							residues[r.name].push(r.seqIndex);
						});
						// Sort residues by indices, ascending
						Object.values(residues).forEach(indices => indices.sort((a, b) => a - b));
						return { id: bindingSite.id, confidence: bindingSite.confidence, residues: residues };
					});

					bindingSiteResults[dseIdx][resIdx] = bindingSites;
					resolve();
				});

				tasks.push(task);
			})
		);
		await Promise.all(tasks);

		const dataSourceExecutorsData = dataSourceExecutors.map<DataSourceExecutorData>((dse, dseIdx) => ({
			dataSourceName: dse.name,
			bindingSites: bindingSiteResults[dseIdx],
			similarSequences: similarSeqResults[dseIdx]
		}));
		return { querySequence: masterQuerySeq, dataSourceExecutorsData };
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
