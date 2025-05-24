import { useEffect, useState } from "react";
import { RcsbFv, RcsbFvTrackDataElementInterface, RcsbFvBoardConfigInterface, RcsbFvRowExtendedConfigInterface } from "@rcsb/rcsb-saguaro";
import { BindingSite, ChainResult, Conservation, Residue } from "../AnalyticalPage";
import chroma from "chroma-js";

type Props = {
    chainResult: ChainResult;
    squashBindingSites: boolean;
};

function RcsbSaguaro({ chainResult, squashBindingSites }: Props) {
    // ID of the DOM element where the plugin is placed
    const elementId = "application-rcsb";
    const predictedPocketColor = "#00aa00";
    const defaultTitleFlagColor = "lightgrey"
    /* If query seq is set to start at 0, it means some sequences might 
    * be in negative numbers on board. */
    const shouldQuerySeqStartAtZero = false;
    const [rcsbFv, setRcsbFv] = useState<RcsbFv>(null);

    useEffect(() => {
        const boardConfigData = createBoardConfigData(chainResult);
        const rowConfigData = createRowConfigData(chainResult);

        if (rcsbFv === null) {
            // Initial load
            const pfv = new RcsbFv({
                boardConfigData,
                rowConfigData,
                elementId
            });
            setRcsbFv(pfv);
        } else {
            // Rerender/Update
            const newConfig = {
                boardConfigData: boardConfigData,
                rowConfigData: rowConfigData
            };
            rcsbFv.updateBoardConfig(newConfig);
        }
    }, [chainResult, squashBindingSites]);

    return (
        <div id={elementId}></div>
    );

    function createBoardConfigData(chainResult: ChainResult) {
        const boardConfigData: RcsbFvBoardConfigInterface = {
            length: chainResult.querySequence.length,
            includeAxis: true,
            highlightHoverPosition: true,
            // TODO Implement
            // highlightHoverCallback: (trackData: Array<RcsbFvTrackDataElementInterface>) => onHighlight(data, molstarPlugin, trackData),
            // elementClickCallback: (trackData?: RcsbFvTrackDataElementInterface, event?: MouseEvent) => elementClicked(data, molstarPlugin, trackData, event)
        };

        return boardConfigData;
    }

    function getAllBindingSites(chainResult: ChainResult) {
        const allBindingSites: BindingSite[] = [];

        for (const res of Object.values(chainResult.dataSourceExecutorResults)) {
            allBindingSites.push(...res.bindingSites);

            if (!res.similarProteins) {
                continue;
            }
            res.similarProteins.forEach(simProt =>
                allBindingSites.push(...simProt.bindingSites));
        }

        return allBindingSites;
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
        if (strings.length === 0) {
            return {};
        }
        if (opacities.length > 0 && strings.length !== opacities.length) {
            throw Error("If opacities are present, they must have the same length as the strings.");
        }
        const colors: Record<string, string> = {};  // key is string (value from params), value is color in hex (with #)

        for (let i = 0; i < strings.length; i++) {
            let str = strings[i];
            if (str in colors) {
                continue;
            }

            const opacity = opacities.length > 0 ? opacities[i] : 1;

            let color: string;
            if (str.startsWith("pocket")) {
                // Let's use fixed color for predicted binding sites
                let baseColor = predictedPocketColor;
                color = chroma(baseColor).alpha(opacity).hex();
            } else {
                let salt = 0;
                do {
                    let baseColor = stringToColor(str);
                    color = chroma(baseColor).alpha(opacity).hex();

                    str += salt.toString(); // This will fix potential hash collisions
                    salt++;
                } while (Object.values(colors).some(existingColor => existingColor === color) || color in forbiddenColors);
            }

            colors[strings[i]] = color;
        }

        return colors;
    }

    function getUniqueColorForEachBindingSite(bindingSites: BindingSite[], forbiddenColors: string[]) {
        const ids = [];
        const confidences = [];
        const minValue = 0.15; // Setting the min value, otherwise the lines in display are not very visible for some colors

        bindingSites.forEach(bindingSite => {
            ids.push(bindingSite.id);
            confidences.push(bindingSite.confidence >= minValue ? bindingSite.confidence : minValue);
        });

        return getUniqueColorForEachString(ids, confidences, forbiddenColors);
    }

    function getUniqueColorForEachDataSource(dataSourceNames: string[]) {
        const opacities = new Array(dataSourceNames.length).fill(0.05);
        return getUniqueColorForEachString(dataSourceNames, opacities);
    }

    function toTrackDataItem(residues: Residue[], color: string): RcsbFvTrackDataElementInterface {
        if (residues.length === 0) {
            return {};
        }
        if (residues.length === 1) {
            return { begin: residues[0].sequenceIndex + 1, end: residues[0].sequenceIndex + 1, gaps: [], color: color };
        }

        residues.sort((a, b) => a.sequenceIndex - b.sequenceIndex);
        const min = residues[0].sequenceIndex;
        const max = residues[residues.length - 1].sequenceIndex;

        const gaps = [];
        for (let i = 1; i < residues.length; i++) {
            const curr = residues[i].sequenceIndex;
            const prev = residues[i - 1].sequenceIndex;

            if ((curr - prev) === 1) { // No gap
                continue;
            }

            const gap = { begin: prev + 1, end: curr + 1 };
            gaps.push(gap);
        }

        return { begin: min + 1, end: max + 1, gaps: gaps, color: color };
    }

    function createQuerySequenceRow(querySequence: string, pdbId: string | null = null) {
        const querySequenceRow: RcsbFvRowExtendedConfigInterface = {
            trackId: "query-seq",
            trackHeight: 20,
            trackColor: "#F9F9F9",
            displayType: "sequence",
            nonEmptyDisplay: true,
            rowTitle: pdbId ?? "Query sequence",
            trackData: [
                {
                    begin: 1,
                    label: querySequence
                }
            ],
            titleFlagColor: defaultTitleFlagColor
        };

        return querySequenceRow;
    }

    function createConservationRow(conservations: Conservation[]) {
        const max = Math.max(...conservations.map(conservation => conservation.value));

        const conservationData = conservations.map(conservation => ({
            begin: conservation.index + 1,
            value: conservation.value / max // normalization
        }));

        const conservationRow: RcsbFvRowExtendedConfigInterface = {
            trackId: "conservation",
            trackHeight: 20,
            trackColor: "#F9F9F9",
            displayType: "area",
            displayColor: "#6d6d6d",
            rowTitle: "Conservation",
            trackData: conservationData,
            titleFlagColor: defaultTitleFlagColor
        };

        return conservationRow;
    }

    function createSimilarSequenceRow(
        id: string,
        title: string,
        sequence: string,
        trackColor: string,
        titleFlagColor: string
    ) {
        const similarSequenceRow: RcsbFvRowExtendedConfigInterface = {
            trackId: id,
            trackHeight: 20,
            trackColor: trackColor,
            displayType: "sequence",
            nonEmptyDisplay: true,
            rowTitle: title,
            trackData: [
                {
                    begin: 1,
                    label: sequence
                }
            ],
            titleFlagColor: titleFlagColor
        };

        return similarSequenceRow;
    }

    function createBlockRowForBindingSite(
        id: string,
        title: string,
        bindingSite: BindingSite,
        color: string,
        trackColor: string,
        titleFlagColor: string | undefined = undefined
    ) {
        const trackDataItem = toTrackDataItem(bindingSite.residues, color);

        const blockRowForResidues: RcsbFvRowExtendedConfigInterface = {
            trackId: id,
            trackHeight: 20,
            trackColor: trackColor,
            displayType: "block",
            rowTitle: title,
            trackData: [trackDataItem],
            titleFlagColor: titleFlagColor
        };

        return blockRowForResidues;
    }

    function createBlockRowForBindingSites(
        id: string,
        title: string,
        bindingSites: BindingSite[],
        bindingSiteColors: Record<string, string>,
        trackColor: string,
        titleFlagColor: string | undefined = undefined
    ) {
        const trackData = bindingSites.map(bindingSite => toTrackDataItem(bindingSite.residues, bindingSiteColors[bindingSite.id]));

        const blockRowForBindingSites = {
            trackId: id,
            trackHeight: 20,
            trackColor: trackColor,
            displayType: "block",
            rowTitle: title,
            trackData: trackData,
            titleFlagColor: titleFlagColor
        };

        return blockRowForBindingSites;
    }

    function createRowConfigData(chainResult: ChainResult) {
        // Prepare colors
        const dataSourceNames = Object.keys(chainResult.dataSourceExecutorResults);
        const dataSourceColors = getUniqueColorForEachDataSource(dataSourceNames);
        const forbiddenColors = Object.values(dataSourceColors);

        const allBindingSites = getAllBindingSites(chainResult);
        /* Data source colors are forbidden here because they are in the background, if some binding site color
         * had the same color as its data source, it would not be visible (maybe just outline). */
        const bindingSiteColors = getUniqueColorForEachBindingSite(allBindingSites, forbiddenColors);

        const allSimilarProteinIds: string[] = [];
        for (const result of Object.values(chainResult.dataSourceExecutorResults)) {
            if (!result.similarProteins) {
                continue;
            }
            result.similarProteins.forEach(simProt => allSimilarProteinIds.push(simProt.pdbId));
        }
        const similarProteinColors = getUniqueColorForEachString(allSimilarProteinIds, [], [defaultTitleFlagColor]);

        // Create rows
        const rowConfigData: RcsbFvRowExtendedConfigInterface[] = [];

        rowConfigData.push(createQuerySequenceRow(chainResult.querySequence));

        for (const [dataSourceName, result] of Object.entries(chainResult.dataSourceExecutorResults)) {
            const dataSourceColor = dataSourceColors[dataSourceName];

            if (squashBindingSites) {
                if (result.bindingSites.length > 0) {
                    const id = `${dataSourceName}-bindingSites`;
                    const title = "Query protein's binding sites";

                    const bindingSitesRow = createBlockRowForBindingSites(
                        id, title, result.bindingSites, bindingSiteColors, dataSourceColor, defaultTitleFlagColor)
                    rowConfigData.push(bindingSitesRow);
                }
            } else {
                result.bindingSites.forEach((bindingSite, idx) => {
                    const id = `${dataSourceName}-${bindingSite.id}-${idx}`;
                    const title = bindingSite.id;

                    const bindingSiteRow = createBlockRowForBindingSite(
                        id, title, bindingSite, bindingSiteColors[bindingSite.id], dataSourceColor, defaultTitleFlagColor);
                    rowConfigData.push(bindingSiteRow)
                });
            }

            if (!result.similarProteins) {
                continue;
            }
            for (const simProt of result.similarProteins) {
                /* index was added to the id because it seems there are proteins which have multiple similar proteins
                 * with the same name, even exactly the same ligands, e.g. 1A3N chain D */
                const id = `${dataSourceName}-${simProt.pdbId}-${simProt.chain}`;
                const title = `${simProt.pdbId.toUpperCase()} (${simProt.chain})`;
                const simProtColor = similarProteinColors[simProt.pdbId];
                const simProtColorTransparent = similarProteinColors[simProt.pdbId] + "80"; // Add alpha channel

                const similarSequenceRow = createSimilarSequenceRow(
                    id, title, simProt.sequence, dataSourceColor, simProtColor);
                rowConfigData.push(similarSequenceRow);

                if (squashBindingSites) {
                    if (simProt.bindingSites.length > 0) {
                        const id = `${dataSourceName}-${simProt.pdbId}-${simProt.chain}-bindingSites`;
                        const title = `${simProt.pdbId.toUpperCase()}'s binding sites`;

                        const bindingSitesRow = createBlockRowForBindingSites(
                            id, title, simProt.bindingSites, bindingSiteColors, dataSourceColor, simProtColorTransparent);
                        rowConfigData.push(bindingSitesRow);
                    }
                } else {
                    simProt.bindingSites.forEach((bindingSite, idx) => {
                        const id = `${dataSourceName}-${simProt.pdbId}-${simProt.chain}-${bindingSite.id}-${idx}`;
                        const title = bindingSite.id.toUpperCase();

                        const simProtBindingSiteRow = createBlockRowForBindingSite(
                            id, title, bindingSite, bindingSiteColors[bindingSite.id], dataSourceColor, simProtColorTransparent);
                        rowConfigData.push(simProtBindingSiteRow)
                    });
                }
            }
        }

        if (chainResult.conservations.length > 0) {
            const conservationRow = createConservationRow(chainResult.conservations);
            rowConfigData.push(conservationRow);
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
