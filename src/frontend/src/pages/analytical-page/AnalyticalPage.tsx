import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useInterval } from "../../shared/hooks/useInterval";
import { useVisibilityChange } from "../../shared/hooks/useVisibilityChange";
import { DataStatus, getDataSourceExecutorResultAPI, getDataSourceExecutorResultStatusAPI } from "../../shared/services/apiCalls";
import RcsbSaguaro from "./components/RcsbSaguaro";

const POLLING_INTERVAL = 1000 * 5; // every 5 seconds

type Residue = {
	id: string;
	index: number; // index in related sequence
};

type BindingSite = {
	id: string;
	confidence: number;
	residues: Residue[];
};

type AlignmentData = {
	querySequenceId: string;
	targetSequenceId: string;
	alignmentLength: number; // TODO asi netreba
	querySequence: string;
	querySequenceAlignmentPartStartIdx: number;
	querySequenceAlignmentPartEndIdx: number;
	querySequenceAlignmentPart: string;
	templateModelingScore: number; // TODO asi netreba
	targetSequence: string;
	targetSequenceAlignmentPartStartIdx: number;
	targetSequenceAlignmentPartEndIdx: number;
	targetSequenceAlignmentPart: string;
};

type Protein = {
	id: string;
	bindingSites: BindingSite[];
	alignmentData: AlignmentData;
};

export type DataSourceExecutorResult = {
	proteins: Protein[];
};

function AnalyticalPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const id = searchParams.get("id");
	if (!id) {
		return <>No id provided.</>
	}
	const dataSourceNames = [
		"foldseek"
	];
	// When pollingInterval is set to null, it is turned off
	const [pollingInterval, setPollingInterval] = useState<number | null>(POLLING_INTERVAL);
	const isPageVisible = useVisibilityChange();
	const [isPollingFinished, setIsPollingFinished] = useState<boolean[]>(new Array(dataSourceNames.length).fill(true));
	const [isFetching, setIsFetching] = useState<boolean[]>(new Array(dataSourceNames.length).fill(false));
	const [dataSourceExecutorResults, setDataSourceExecutorResults] = useState<(DataSourceExecutorResult | null)[]>(new Array(dataSourceNames.length).fill(null));
	const [alignedSequences, setAlignedSequences] = useState<string[]>([]);

	useEffect(() => {
		if (isPollingFinished.some(x => x === false) || dataSourceExecutorResults.some(x => x === null)) {
			return;
		}
		const proteins = dataSourceExecutorResults.map(res => res!.proteins).flat();
		const alignedSequencesTmp = alignSequences(proteins.map(p => ({
			querySequenceAlignmentObject: {
				sequence: p.alignmentData.querySequence,
				alignedPartStartIdx: p.alignmentData.querySequenceAlignmentPartStartIdx,
				alignedPartEndtIdx: p.alignmentData.querySequenceAlignmentPartEndIdx,
				alignedPart: p.alignmentData.querySequenceAlignmentPart
			},
			targetSequenceAlignmentObject: {
				sequence: p.alignmentData.targetSequence,
				alignedPartStartIdx: p.alignmentData.targetSequenceAlignmentPartStartIdx,
				alignedPartEndtIdx: p.alignmentData.targetSequenceAlignmentPartEndIdx,
				alignedPart: p.alignmentData.targetSequenceAlignmentPart
			}
		})));
		setAlignedSequences(alignedSequencesTmp);
	}, [dataSourceExecutorResults]);

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
			updateIsFetching(dataSourceIndex, true);
			const { status, errorMessages: statusFetchingErrorMessages } = await getDataSourceExecutorResultStatusAPI(dataSourceNames[dataSourceIndex], id!);
			if (statusFetchingErrorMessages.length > 0) {
				// TODO stop polling for this data source?
				// TODO display error messages
				// TODO what about DataStatus.Failed? Maybe handle here as well as some other error?
				updateIsFetching(dataSourceIndex, false);
				return;
			}
			if (status !== DataStatus.Completed) {
				updateIsFetching(dataSourceIndex, false);
				return;
			}
			
			const { data, errorMessages: dataFetchingErrorMessages } = await getDataSourceExecutorResultAPI(dataSourceNames[dataSourceIndex], id!);
			if (dataFetchingErrorMessages.length > 0) {
				// TODO Maybe handle/display error messages somehow?
				updateIsPollingFinished(dataSourceIndex, true);
				if (isPollingFinished.every(x => x)) {
					setPollingInterval(null);
				}
				updateIsFetching(dataSourceIndex, false);
				return;
			}
			
			updateDataSourceExecutorResults(dataSourceIndex, data);
			// Data was received, its state won't change, so polling is not required anymore
			updateIsPollingFinished(dataSourceIndex, true);
			if (isPollingFinished.every(x => x)) {
				setPollingInterval(null);
			}
			updateIsFetching(dataSourceIndex, false);
		}

		for (let i = 0; i < dataSourceNames.length; i++) {
			if (isFetching[i]) {
				continue;
			}
			fetchDataFromDataSource(i);
		}
	}, pollingInterval);


	return (
		<div id="analyze" className="display-none row">
			<div id="visualization" className="col-xs-12 col-md-7 col-xl-7">
				<div id="application-rcsb">
					{alignedSequences.length > 0 && (
						<RcsbSaguaro proteins={alignedSequences} />
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

	function updateIsFetching(index: number, newValue: boolean) {
		setIsFetching(prevState =>
			prevState.map((item, i) => (i === index ? newValue : item))
		);
	};

	function updateIsPollingFinished(index: number, newValue: boolean) {
		setIsPollingFinished(prevState =>
			prevState.map((item, i) => (i === index ? newValue : item))
		);
	};

	function updateDataSourceExecutorResults(index: number, newValue: any | null) {
		setDataSourceExecutorResults(prevState =>
			prevState.map((item, i) => (i === index ? newValue : item))
		);
	};

	type SequenceAlignmentObject = {
		sequence: string;
		alignedPartStartIdx: number;
		alignedPartEndtIdx: number;
		alignedPart: string;
	};
	
	type SequenceAlignmentObjectPair = {
		querySequenceAlignmentObject: SequenceAlignmentObject,
		targetSequenceAlignmentObject: SequenceAlignmentObject
	};
	
	type AlignedSequencePair = {
		querySequence: string;
		querySequenceAlignedPartStartIdx: number;
		targetSequence: string;
		targetSequenceAlignedPartStartIdx: number;
	};
	
	function replaceWithAlignedPart(sequenceAlignmentObject: SequenceAlignmentObject) {
		const startPart = sequenceAlignmentObject.sequence.slice(0, sequenceAlignmentObject.alignedPartStartIdx);
		const endPart = sequenceAlignmentObject.sequence.slice(sequenceAlignmentObject.alignedPartEndtIdx);
	
		return startPart + sequenceAlignmentObject.alignedPart + endPart;
	}
	
	function alignSequencePair(sequenceAlignmentObjectPair: SequenceAlignmentObjectPair): AlignedSequencePair {
		const querySequenceAlignmentObject = sequenceAlignmentObjectPair.querySequenceAlignmentObject;
		const targetSequenceAlignmentObject = sequenceAlignmentObjectPair.targetSequenceAlignmentObject;
	
		let querySeqWithAlignedPart = replaceWithAlignedPart(querySequenceAlignmentObject);
		let targetSeqWithAlignedPart = replaceWithAlignedPart(targetSequenceAlignmentObject);
	
		let querySeqAlignedPartStartIdx = querySequenceAlignmentObject.alignedPartStartIdx;
		let targetSeqAlignedPartStartIdx = targetSequenceAlignmentObject.alignedPartStartIdx;
		/* Pad the beginning of the sequence with the smaller start index  
		 * to align the start indices of both sequences. */
		if (querySequenceAlignmentObject.alignedPartStartIdx < targetSequenceAlignmentObject.alignedPartStartIdx) {
			const gapCount = targetSequenceAlignmentObject.alignedPartStartIdx - querySequenceAlignmentObject.alignedPartStartIdx;
			querySeqWithAlignedPart = querySeqWithAlignedPart.padStart(querySeqWithAlignedPart.length + gapCount, "-");
			querySeqAlignedPartStartIdx += gapCount;
		} else {
			const gapCount = querySequenceAlignmentObject.alignedPartStartIdx - targetSequenceAlignmentObject.alignedPartStartIdx;
			targetSeqWithAlignedPart = targetSeqWithAlignedPart.padStart(targetSeqWithAlignedPart.length + gapCount, "-");
			targetSeqAlignedPartStartIdx += gapCount;
		}
	
		/* Pad the shorter sequence to match the length of the longer one. */
		if (querySeqWithAlignedPart.length < targetSeqWithAlignedPart.length) {
			const gapCount = targetSeqWithAlignedPart.length - querySeqWithAlignedPart.length;
			querySeqWithAlignedPart = querySeqWithAlignedPart.padEnd(querySeqWithAlignedPart.length + gapCount, "-");
		} else {
			const gapCount = querySeqWithAlignedPart.length - targetSeqWithAlignedPart.length;
			targetSeqWithAlignedPart = targetSeqWithAlignedPart.padEnd(targetSeqWithAlignedPart.length + gapCount, "-");
		}
	
		const alignedSequencePair: AlignedSequencePair = {
			querySequence: querySeqWithAlignedPart,
			querySequenceAlignedPartStartIdx: querySeqAlignedPartStartIdx,
			targetSequence: targetSeqWithAlignedPart,
			targetSequenceAlignedPartStartIdx: targetSeqAlignedPartStartIdx
		};
		return alignedSequencePair;
	}
	
	function alignSequences(sequenceAlignmentObjectPairs: SequenceAlignmentObjectPair[]) {
		if (sequenceAlignmentObjectPairs.length === 0) {
			return [];
		}
		const alignedPairs = sequenceAlignmentObjectPairs.map(pair => alignSequencePair(pair));
		console.log("aligned paaary")
		for (const pair of alignedPairs) console.log(`${pair.querySequence.length} - ${pair.targetSequence.length}`)
	
		let querySeqResult = "";
		const targetSeqResults: string[] = new Array(alignedPairs.length).fill("");
		// Length of the query sequence (sequence with no gaps)
		const querySeqLength = alignedPairs[0].querySequence.split('').filter(c => c !== '-').join("").length;
		const offsets: number[] = new Array(alignedPairs.length).fill(0);
	
		for (let aminoAcidIdx = 0; aminoAcidIdx < querySeqLength; aminoAcidIdx++) {
			const isGapMode = alignedPairs.some((pair, pairIdx) => pair.querySequence[aminoAcidIdx + offsets[pairIdx]] === '-');
	
			let aminoAcidOfQuerySeq: string = null!;
			for (let pairIdx = 0; pairIdx < alignedPairs.length; pairIdx++) {
				const pair = alignedPairs[pairIdx];
				const offset = offsets[pairIdx];
	
				const aminoAcidOrGapOfQuerySeq = pair.querySequence[aminoAcidIdx + offset];
				if (isGapMode) {
					if (aminoAcidOrGapOfQuerySeq === '-') {
						targetSeqResults[pairIdx] = targetSeqResults[pairIdx] + pair.targetSequence[aminoAcidIdx + offset];
						offsets[pairIdx] = offset + 1;
					} else {
						targetSeqResults[pairIdx] = targetSeqResults[pairIdx] + '-';
					}
				} else {
					/* All of the pairs have the same query sequence (if we ignore gaps). On the (aminoAcidIdx + offset) index
					* is the same amino acid for all the pairs, which means that here is (for all of the pairs)
					* always assigned the same amino acid. Which might seem odd (that we keep reassigning the same value),
					* but it is correct and to avoid further program branching it will be left like this. */
					aminoAcidOfQuerySeq = aminoAcidOrGapOfQuerySeq;
					targetSeqResults[pairIdx] = targetSeqResults[pairIdx] + pair.targetSequence[aminoAcidIdx + offset];
				}
			}
	
			if (isGapMode) {
				querySeqResult = querySeqResult + '-';
				aminoAcidIdx--; // Sequences with gaps where shifted, repeat for the same amino acid
			} else {
				querySeqResult = querySeqResult + aminoAcidOfQuerySeq;
			}
		}
	
		return [querySeqResult, ...targetSeqResults];
	}
}

export default AnalyticalPage;
