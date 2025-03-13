import { useEffect } from "react";
import { RcsbFv } from "@rcsb/rcsb-saguaro";
import { ProcessedResult } from "../AnalyticalPage";
import chroma from "chroma-js";

type Props = {
    processedResult: ProcessedResult;
};

function RcsbSaguaro({ processedResult }: Props) {
    // ID of the DOM element where the plugin is placed
    const elementId = "application-rcsb";
    /* If query seq is set to start at 0, it means some sequences might 
     * be in negative numbers on board. */
    const shouldQuerySeqStartAtZero = false;

    const boardConfigData = {
        // range: {
        //     min: boardRange.from,
        //     max: boardRange.to
        // },
        // length: boardRange.to - boardRange.from,
        length: processedResult.querySequence.length,
        // trackWidth: 940,
        includeAxis: true
    };

    const rowConfigData = [];
    rowConfigData.push(createQuerySequenceRow(processedResult.querySequence));
    for (let dseIdx = 0; dseIdx < processedResult.dataSourceExecutorsData.length; dseIdx++) {
        const dseData = processedResult.dataSourceExecutorsData[dseIdx];
        for (let resIdx = 0; resIdx < dseData.similarSequences.length; resIdx++) {
            const similarSequence = dseData.similarSequences[resIdx];
            const bindingSites = dseData.bindingSites[resIdx];

            rowConfigData.push(createSequenceRow(resIdx.toString(), `Similar sequence #${resIdx}`, similarSequence));

            bindingSites.forEach(bindingSite =>
                rowConfigData.push(createBlockRow(`${resIdx}-${bindingSite.id}`, bindingSite.id, bindingSite.residues, bindingSite.confidence)));
        }
    }

    useEffect(() => {
        const pfv = new RcsbFv({
            boardConfigData,
            rowConfigData,
            elementId
        });
    }, []);

    return (
        <div id={elementId} style={{ marginTop: "50px" }}></div>
    )

    // Update sequences to use common similar parts (with -)
    function createSequencesWithSubstitutedCommonSimilarParts(sequences: string[], similar_sequences: string[], start_indices: number[]) {
        for (let i = 1; i < sequences.length; i++) { // we skip i = 0 because it is a query sequence (no common similar part TODO?)
            const sequence = sequences[i];

            const firstPart = sequence.substring(0, start_indices[i]);
            const secondPart = similar_sequences[i];
            const end_index = start_indices[i] + similar_sequences[i].length;
            const thirdPart = (sequence.length - 1) >= (end_index + 1)
                ? sequence.substring(end_index + 1)
                : "";

            sequences[i] = firstPart + secondPart + thirdPart;
        }

        return sequences;
    }

    // Calculate alignment
    function calculateStartIndicesAfterAligning(start_indices: number[]) {
        if (start_indices.length == 0) {
            return start_indices;
        }

        let max = start_indices[0];
        let negative_indices = [];

        for (let i = 0; i < start_indices.length; i++) {
            let idx = start_indices[i];
            if (idx > max) {
                max = idx;
            }
            negative_indices.push(-idx);
        }

        /* It is expected that start_indices[0] corresponds to query seq.
         * If query seq should start at 0, we move it so it starts at 0 and other sequences 
         * are moved by the same amount/distance as well. Otherwise, if we use only 
         * non negative nums on board (!shouldQuerySeqStartAtZero case), we move 
         * every sequence by max (so the sequence with leftmost starting index, starts at 0). */
        const offset = shouldQuerySeqStartAtZero ? start_indices[0] : max;
        for (let i = 0; i < start_indices.length; i++) {
            start_indices[i] = negative_indices[i] + offset;
        }

        return start_indices;
    }

    // Calculate board range (from, to)
    function calculateBoardRange(sequences: string[], start_indices: number[]) {
        if (sequences.length !== start_indices.length || start_indices.length == 0) {
            throw new Error("No sequences or their start indices provided, or count of sequences and indices does not match.");
        }
        let min = start_indices[0];
        let max = start_indices[0] + sequences[0].length - 1;

        // we start from i = 1 because 0. iteration is basically done by variables init phase before the for cycle
        for (let i = 1; i < sequences.length; i++) {
            if (start_indices[i] < min) {
                min = start_indices[i];
            }

            let end_idx = start_indices[i] + sequences[i].length - 1;
            if (end_idx > max) {
                max = end_idx;
            }
        }

        const range = {
            "from": min,
            "to": max
        };
        return range;
    }

    function createQuerySequenceRow(querySequence: string) {
        return {
            trackId: "query-seq",
            trackHeight: 20,
            trackColor: "#F9F9F9",
            displayType: "sequence",
            nonEmptyDisplay: true,
            rowTitle: "Query sequence",
            trackData: [
                {
                    begin: 0,
                    label: querySequence
                }
            ]
        };
    }

    function createSequenceRow(id: string, title: string, sequence: string) {
        return {
            trackId: id,
            trackHeight: 20,
            trackColor: "#F9F9F9",
            displayType: "sequence",
            nonEmptyDisplay: true,
            rowTitle: title,
            trackData: [
                {
                    begin: 0,
                    label: sequence
                }
            ]
        };
    }

    function stringToColor(str: string) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
        }

        const color = chroma.scale("Spectral")
                        .mode("lab")
                        .colors(100)[Math.abs(hash) % 100];

        return color;
    }

    function getResidueColor(residueName: string, confidence: number) {
        let baseColor = stringToColor(residueName);

        return chroma(baseColor).alpha(confidence).hex();
    }

    function createBlockRow(
        id: string,
        title: string,
        residues: Record<string, number[]>,
        confidence: number
    ) {
        const trackData = [];
        Object.entries(residues).forEach(([residueName, indices]) =>
            trackData.push(...indices.map(idx => ({
                begin: idx,
                end: idx,
                color: getResidueColor(residueName, confidence)
            })))
        );

        return {
            trackId: id,
            trackHeight: 20,
            trackColor: "#F9F9F9",
            displayType: "block",
            displayColor: "#FF0000",
            rowTitle: title,
            trackData: trackData
        };
    }
}

export default RcsbSaguaro;
