import { useEffect } from "react";
import { RcsbFv } from "@rcsb/rcsb-saguaro";
import { BindingSite, ProcessedResult } from "../AnalyticalPage";
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

    useEffect(() => {
        const boardConfigData = createBoardConfigData();
        const rowConfigData = createRowConfigData(processedResult);

        const pfv = new RcsbFv({
            boardConfigData,
            rowConfigData,
            elementId
        });
    }, [processedResult]);

    return (
        <div id={elementId} style={{ marginTop: "50px" }}></div>
    )

    function createBoardConfigData() {
        const boardConfigData = {
            length: processedResult.querySequence.length,
            includeAxis: true
        };

        return boardConfigData;
    }

    function getAllBindingSites(processedResult: ProcessedResult) {
        return processedResult.dataSourceExecutorsData.flatMap(dseData => dseData.bindingSites.flat());
    }

    function stringToColor(str: string) {
        let hash1 = 0;
        let hash2 = 0;
        for (let i = 0; i < str.length; i++) {
            hash1 = (hash1 << 5) - hash1 + str.charCodeAt(i);
            hash2 = (hash2 << 9) - hash2 + str.charCodeAt(i);
        }
        const hash = (hash1 ^ hash2) >>> 0;

        const color = chroma.scale("Spectral")
            .mode("lab")
            .colors(100)[Math.abs(hash) % 100];

        return color;
    }

    /**
     * Generates a unique color for each string in the given array.
     *
     * @param {string[]} strings - An array of strings for which unique colors should be generated.
     * @param {number[]} [opacities=[]] - An optional array of opacities (from [0;1], e.g. [0.4, 0.2, ...])
     *                                    corresponding to each string. If provided, it must have the same length as `strings`.
     * @param {string[]} [forbiddenColors=[]] - An optional list of colors that should be avoided.
     * 
     * @returns {Record<string, string>} - An object mapping each string to a unique color in hex format (starting with #).
     * 
     * @throws {Error} - If `opacities` is provided but does not match the length of `strings`.
     */
    function getUniqueColorForEachString(
        strings: string[],
        opacities: number[] = [],
        forbiddenColors: string[] = []
    ) {
        if (opacities.length > 0 && strings.length !== opacities.length) {
            throw Error("If opacities are present, they must have the same length as the strings.");
        }
        const colors: Record<string, string> = {};  // key is string (value from params), value is color in hex (with #)

        for (let i = 0; i < strings.length; i++) {
            let str = strings[i];
            if (str in colors) {
                continue;
            }
            const opacity = opacities !== null ? opacities[i] : null;

            let color: string;
            do {
                let baseColor = stringToColor(str);
                color = opacities !== null
                    ? chroma(baseColor).alpha(opacity).hex()
                    : chroma(baseColor).hex();
                console.log(`${str} : ${color}`)
                str += "salt"; // This will fix potential hash collisions
            } while (Object.values(colors).some(existingColor => existingColor === color) || color in forbiddenColors);

            colors[strings[i]] = color;
        }

        return colors;
    }

    function getUniqueColorForEachBindingSite(bindingSites: BindingSite[]) {
        const ids = [];
        const confidences = [];

        bindingSites.forEach(bindingSite => {
            ids.push(bindingSite.id);
            confidences.push(bindingSite.confidence);
        });

        return getUniqueColorForEachString(ids, confidences);
    }

    function getUniqueColorForEachDataSource(dataSourceNames: string[], forbiddenColors: string[]) {
        const opacities = new Array(dataSourceNames.length).fill(0.1);
        return getUniqueColorForEachString(dataSourceNames, opacities, forbiddenColors);
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

    function createSequenceRow(id: string, title: string, sequence: string, trackColor: string) {
        return {
            trackId: id,
            trackHeight: 20,
            trackColor: trackColor,
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

    function createBlockRow(
        id: string,
        title: string,
        residues: Record<string, number[]>,
        color: string,
        trackColor: string
    ) {
        const trackData = [];
        Object.entries(residues).forEach(([residueName, indices]) =>
            trackData.push(...indices.map(idx => ({
                begin: idx,
                end: idx,
                color: color
            })))
        );

        return {
            trackId: id,
            trackHeight: 20,
            trackColor: trackColor,
            displayType: "block",
            rowTitle: title,
            trackData: trackData
        };
    }

    function createRowConfigData(processedResult: ProcessedResult) {
        const bindingSiteColors = getUniqueColorForEachBindingSite(getAllBindingSites(processedResult));
        const dataSourceColors = getUniqueColorForEachDataSource(
            processedResult.dataSourceExecutorsData.map(x => x.dataSourceName), Object.values(bindingSiteColors));

        const rowConfigData = [];

        rowConfigData.push(createQuerySequenceRow(processedResult.querySequence));

        for (let dseIdx = 0; dseIdx < processedResult.dataSourceExecutorsData.length; dseIdx++) {
            const dseData = processedResult.dataSourceExecutorsData[dseIdx];
            const dataSourceColor = dataSourceColors[dseData.dataSourceName];

            for (let resIdx = 0; resIdx < dseData.similarSequences.length; resIdx++) {
                const similarSequence = dseData.similarSequences[resIdx];
                const bindingSites = dseData.bindingSites[resIdx];

                if (similarSequence.sequence.length > 0) {
                    // We don't have to have a similar sequence, maybe only binding sites are present
                    const simSeqRowId = `${dseIdx}-${resIdx}`;
                    const simSeqRowTitle = similarSequence.label.toUpperCase();
                    const simSeqRow = createSequenceRow(simSeqRowId, simSeqRowTitle, similarSequence.sequence, dataSourceColor);
                    rowConfigData.push(simSeqRow);
                }

                bindingSites.forEach(bindingSite => {
                    const id = `${dseIdx}-${resIdx}-${bindingSite.id}`;
                    const title = bindingSite.id;
                    const bindingSiteRow = createBlockRow(id, title, bindingSite.residues, bindingSiteColors[bindingSite.id], dataSourceColor);
                    rowConfigData.push(bindingSiteRow)
                });
            }
        }

        return rowConfigData;
    }

    // TODO maybe delete
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

    // TODO maybe delete
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

    // TODO maybe delete
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
}

export default RcsbSaguaro;
