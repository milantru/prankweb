import { useEffect } from "react";

export type QueryProtein = {
    sequence: string;
    similarPartStartIndex: number;
};

export type SimilarProtein = {
    sequence: string;
    similarPartStartIndex: number;
    similarPart: string;
};

type Props = {
    queryProtein: QueryProtein;
    similarProteins: SimilarProtein[];
};

function RcsbSaguaro({ queryProtein, similarProteins }: Props) {
    const elementId = "pfv";
    /* If query seq is set to start at 0, it means some sequences might 
     * be in negative numbers on board. */
    const shouldQuerySeqStartAtZero = false;

    let sequences = [
        queryProtein.sequence,
        ...similarProteins.map(p => p.sequence)
    ];

    const start_indices = [
        queryProtein.similarPartStartIndex,
        ...similarProteins.map(p => p.similarPartStartIndex)
    ]; // start indices of the (common) similar parts

    const common_similar_parts = [
        "", // placeholder value so the indexes match
        ...similarProteins.map(p => p.similarPart)
    ];

    sequences = createSequencesWithSubstitutedCommonSimilarParts(sequences, common_similar_parts, start_indices);

    const start_indices_after_aligning = calculateStartIndicesAfterAligning(start_indices);

    const boardRange = calculateBoardRange(sequences, start_indices_after_aligning);

    const boardConfigData = {
        range: {
            min: boardRange.from,
            max: boardRange.to
        },
        // length: boardRange.to - boardRange.from,
        trackWidth: 940,
        includeAxis: true
    };

    const rowConfigData = [
        {
            trackId: "querySequenceTrack",
            trackHeight: 20,
            trackColor: "#F9F9F9",
            displayType: "sequence",
            nonEmptyDisplay: true,
            rowTitle: "QUERY SEQUENCE",
            trackData: [
                {
                    begin: start_indices_after_aligning[0],
                    label: sequences[0] // query sequence
                }
            ]
        },
        {
            trackId: "queryBlockTrack",
            trackHeight: 20,
            trackColor: "#F9F9F9",
            displayType: "block",
            displayColor: "#FF0000",
            rowTitle: "BLOCK",
            trackData: [
                {
                    begin: 30,
                    end: 60,
                    gaps: [{
                        begin: 40,
                        end: 50
                    }]
                },
                {
                    begin: 50,
                    end: 80
                }
            ]
        },
        {
            trackId: "similarSequence1Track",
            trackHeight: 20,
            trackColor: "#F9F9F9",
            displayType: "sequence",
            nonEmptyDisplay: true,
            rowTitle: "SIMILAR SEQUENCE 1",
            trackData: [
                {
                    begin: start_indices_after_aligning[1],
                    label: sequences[1]
                }
            ]
        },
        {
            trackId: "similarSequence1BlockTrack",
            trackHeight: 20,
            trackColor: "#F9F9F9",
            displayType: "block",
            displayColor: "#FF0000",
            rowTitle: "BLOCK",
            trackData: [
                {
                    begin: 30,
                    end: 60
                },
                {
                    begin: 50,
                    end: 80
                }
            ]
        },
        {
            trackId: "similarSequence2Track",
            trackHeight: 20,
            trackColor: "#90D5FF77",
            displayType: "sequence",
            nonEmptyDisplay: true,
            rowTitle: "SIMILAR SEQUENCE 2",
            trackData: [
                {
                    begin: start_indices_after_aligning[2],
                    label: sequences[2]
                }
            ]
        },
        {
            trackId: "similarSequence2BlockTrack",
            trackHeight: 20,
            trackColor: "#90D5FF77",
            displayType: "block",
            displayColor: "#33FF33",
            rowTitle: "BLOCK",
            trackData: [
                {
                    begin: 20,
                    end: 20
                },
                {
                    begin: 30,
                    end: 30,
                    color: "#000000"
                },
                {
                    begin: 50,
                    end: 50
                },
                {
                    begin: 50,
                    end: 50,
                    color: "#FF3333"
                }
            ]
        }
    ];



    useEffect(() => {
        const pfv = new RcsbFv.Create({
            boardConfigData,
            rowConfigData,
            elementId
        })
    }, []);

    return (
        <div id={elementId} style={{ marginTop: "50px" }}></div>
    )

    // Update sequences to use common similar parts (with -)
    function createSequencesWithSubstitutedCommonSimilarParts(sequences: string[], similar_sequences: string[], start_indices: number[]) {
        for (let i = 1; i < sequences.length; i++) { // we skip i = 0 because it's a query sequence (no common similar part)
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
}

export default RcsbSaguaro;
