import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { RcsbFv, RcsbFvTrackDataElementInterface, RcsbFvBoardConfigInterface, RcsbFvRowExtendedConfigInterface, RcsbFvTooltipInterface } from "@rcsb/rcsb-saguaro";
import { BindingSite, ChainResult, Conservation } from "../AnalyticalPage";
import chroma from "chroma-js";

export type RcsbSaguaroHandle = {
    getRcsbPlugin: () => RcsbFv | null;
};

type Props = {
    classes?: string;
    chainResult: ChainResult;
    squashBindingSites: boolean;
    startQuerySequenceAtZero: boolean;
    onHighlight: (structureIndex: number) => void;
    onClick: (structureIndex: number) => void;
};

const RcsbSaguaro = forwardRef(({
    classes = "",
    chainResult,
    squashBindingSites,
    startQuerySequenceAtZero,
    onHighlight,
    onClick }: Props, ref) => {
    // ID of the DOM element where the plugin is placed
    const elementId = "application-rcsb";
    const predictedPocketColor = "#00aa00";
    const defaultTitleFlagColor = "lightgrey"
    /* If query seq is set to start at 0, it means some sequences might 
    * be in negative numbers on board. */
    const shouldQuerySeqStartAtZero = false; // TODO delete probably
    const [rcsbFv, setRcsbFv] = useState<RcsbFv>(null);
    const [colorsInitialized, setColorsInitialized] = useState<boolean>(false);
    const dataSourcesColors = useRef<Record<string, string>>(null!); // dataSourcesColors[dataSourceName] -> color in hex, e.g. #0ff1ce
    const bindingSitesColors = useRef<Record<string, string>>(null!); // bindingSitesColors[bindingSiteId] -> color in hex, e.g. #0ff1ce
    const similarProteinsColors = useRef<Record<string, string>>(null!); // similarProteinsColors[pdbId] -> color in hex, e.g. #0ff1ce
    const isFirstRender = useRef(true);
    const offset = useRef(0);

    useImperativeHandle(ref, () => ({
        getRcsbPlugin
    }));

    useEffect(() => {
        if (!isFirstRender.current) {
            initBoard();
        }
    }, [squashBindingSites, startQuerySequenceAtZero]);

    useEffect(() => {
        initColors();
        initBoard();
        isFirstRender.current = false;
    }, [chainResult]);

    return (
        <div className={classes}>
            {/* Rcsb saguaro (sequence visualisation) */}
            <div id={elementId}></div>

            {/* Legend */}
            <div className="w-75 d-flex my-3 mx-auto p-2 border justify-content-center align-items-center">
                {colorsInitialized && Object.keys(chainResult.dataSourceExecutorResults).map(dataSourceName => (
                    <div key={dataSourceName} className="d-flex align-items-center mr-3">
                        <span className="mr-2"
                            style={{
                                width: "40px",
                                height: "20px",
                                backgroundColor: dataSourcesColors.current[dataSourceName],
                                display: "inline-block",
                                border: "1px solid #ccc",
                            }} />
                        <span>{dataSourceName}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    function getSequenceStartIndex(sequenceWithGaps: string) {
        let counter = 0;

        for (const aminoAcidOrGap of sequenceWithGaps) {
            if (aminoAcidOrGap !== "-") {
                return counter;
            }
            counter++;
        }

        return counter;
    }

    function initColors() {
        setColorsInitialized(false);
        // Colors for data sources
        const dataSourceNames = Object.keys(chainResult.dataSourceExecutorResults);
        dataSourcesColors.current = getUniqueColorForEachDataSource(dataSourceNames);
        const forbiddenColors = Object.values(dataSourcesColors.current);

        // Colors for binding sites
        const allBindingSites = getAllBindingSites(chainResult);
        /* Data source colors are forbidden here because they are in the background, if some binding site color
         * had the same color as its data source, it would not be visible (maybe just outline). */
        bindingSitesColors.current = getUniqueColorForEachBindingSite(allBindingSites, forbiddenColors);

        // Colors for similar proteins
        const allSimilarProteinIds: string[] = [];
        for (const result of Object.values(chainResult.dataSourceExecutorResults)) {
            if (!result.similarProteins) {
                continue;
            }
            result.similarProteins.forEach(simProt => allSimilarProteinIds.push(simProt.pdbId));
        }
        similarProteinsColors.current = getUniqueColorForEachString(allSimilarProteinIds, [], [defaultTitleFlagColor]);
        setColorsInitialized(true);
    }

    function initBoard() {
        if (startQuerySequenceAtZero) {
            const querySequenceStartIdx = getSequenceStartIndex(chainResult.querySequence);
            /* +1 is here to "negate" +1 which we use when visualissing items
             * (we use +1 when visualising items because it seems rcsb saguaro 
             * expects sequence to start from 1 and not from 0).*/
            offset.current = querySequenceStartIdx + 1;
        } else {
            offset.current = 0;
        }

        const boardConfigData = createBoardConfigData(chainResult);
        const rowConfigData = createRowConfigData(chainResult);

        if (rcsbFv === null) {
            // Initial load
            const rcsbPlugin = new RcsbFv({
                boardConfigData,
                rowConfigData,
                elementId
            });
            setRcsbFv(rcsbPlugin);
        } else {
            // Rerender/Update
            const newConfig = {
                boardConfigData: boardConfigData,
                rowConfigData: rowConfigData
            };
            rcsbFv.updateBoardConfig(newConfig);
        }
    }

    function getRcsbPlugin(): RcsbFv | null {
        // Theoretically may return null if plugin was not created yet (when component is not initialized yet)
        return rcsbFv;
    }

    function createBoardConfigData(chainResult: ChainResult) {
        const tooltipGenerator: RcsbFvTooltipInterface = {
            showTooltip: (d: RcsbFvTrackDataElementInterface): HTMLElement | undefined => {
                const tooltipDiv = document.createElement("div");

                tooltipDiv.innerHTML = `
                    <strong>Position:</strong> ${d.begin}${d.end ? ` - ${d.end}` : ""}${d.label ? ` | ${d.label}` : ""}
                `;

                return tooltipDiv;
            }
        };

        const boardConfigData: RcsbFvBoardConfigInterface = {
            range: {
                min: 0 - offset.current,
                max: chainResult.querySequence.length - 1 - offset.current
            },
            includeAxis: true,
            highlightHoverPosition: true,
            // TODO Implement
            highlightHoverCallback: handleHighlight,
            elementClickCallback: (trackData?: RcsbFvTrackDataElementInterface, _?: MouseEvent) => elementClicked(trackData),
            tooltipGenerator: tooltipGenerator
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

    function toTrackDataItem(bindingSite: BindingSite, color: string, dataSourceName: string): RcsbFvTrackDataElementInterface {
        const residues = bindingSite.residues;
        if (residues.length === 0) {
            return {};
        }

        const label = `<strong>Confidence:</strong> ${bindingSite.confidence} | <strong>Source:</strong> ${dataSourceName}`;
        if (residues.length === 1) {
            const trackDataItem: RcsbFvTrackDataElementInterface = {
                begin: residues[0].sequenceIndex + 1 - offset.current,
                end: residues[0].sequenceIndex + 1 - offset.current,
                gaps: [],
                color: color,
                label: label
            };
            return trackDataItem;
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

            const gap = { begin: prev + 1 - offset.current, end: curr + 1 - offset.current };
            gaps.push(gap);
        }

        const trackDataItem: RcsbFvTrackDataElementInterface = {
            begin: min + 1 - offset.current,
            end: max + 1 - offset.current,
            gaps: gaps,
            color: color,
            label: label
        };
        return trackDataItem;
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
                    begin: 1 - offset.current,
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
            begin: conservation.index + 1 - offset.current,
            value: conservation.value / max, // normalization
            label: `<strong>Value:</strong> ${conservation.value}`
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
        dataSourceName: string,
        titleFlagColor: string
    ) {
        const similarSequenceRow: RcsbFvRowExtendedConfigInterface = {
            trackId: id,
            trackHeight: 20,
            trackColor: dataSourcesColors.current[dataSourceName],
            displayType: "sequence",
            nonEmptyDisplay: true,
            rowTitle: title,
            trackData: [
                {
                    begin: 1 - offset.current,
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
        dataSourceName: string,
        titleFlagColor: string | undefined = undefined,
    ) {
        const trackDataItem = toTrackDataItem(bindingSite, bindingSitesColors.current[bindingSite.id], dataSourceName);

        const blockRowForResidues: RcsbFvRowExtendedConfigInterface = {
            trackId: id,
            trackHeight: 20,
            trackColor: dataSourcesColors.current[dataSourceName],
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
        dataSourceName: string,
        titleFlagColor: string | undefined = undefined,
    ) {
        const trackData = bindingSites.map(bindingSite =>
            toTrackDataItem(bindingSite, bindingSitesColors.current[bindingSite.id], dataSourceName));

        const blockRowForBindingSites = {
            trackId: id,
            trackHeight: 20,
            trackColor: dataSourcesColors.current[dataSourceName],
            displayType: "block",
            rowTitle: title,
            trackData: trackData,
            titleFlagColor: titleFlagColor
        };

        return blockRowForBindingSites;
    }

    function createRowConfigData(chainResult: ChainResult) {
        // Create rows
        const rowConfigData: RcsbFvRowExtendedConfigInterface[] = [];

        const querySequenceRow = createQuerySequenceRow(chainResult.querySequence);
        rowConfigData.push(querySequenceRow);

        for (const [dataSourceName, result] of Object.entries(chainResult.dataSourceExecutorResults)) {
            if (squashBindingSites) {
                if (result.bindingSites.length > 0) {
                    const id = `${dataSourceName}-bindingSites`;
                    const title = "Query protein's binding sites";

                    const bindingSitesRow = createBlockRowForBindingSites(
                        id, title, result.bindingSites, dataSourceName, defaultTitleFlagColor)
                    rowConfigData.push(bindingSitesRow);
                }
            } else {
                result.bindingSites.forEach((bindingSite, idx) => {
                    const id = `${dataSourceName}-${bindingSite.id}-${idx}`;
                    const title = bindingSite.id;

                    const bindingSiteRow = createBlockRowForBindingSite(
                        id, title, bindingSite, dataSourceName, defaultTitleFlagColor);
                    rowConfigData.push(bindingSiteRow)
                });
            }

            if (!result.similarProteins) {
                continue;
            }
            for (const simProt of result.similarProteins) {
                const id = `${dataSourceName}-${simProt.pdbId}-${simProt.chain}`;
                const title = `${simProt.pdbId.toUpperCase()} (${simProt.chain})`;
                const simProtColor = similarProteinsColors.current[simProt.pdbId];
                const simProtColorTransparent = simProtColor + "80"; // Add alpha channel

                const similarSequenceRow = createSimilarSequenceRow(
                    id, title, simProt.sequence, dataSourceName, simProtColor);
                rowConfigData.push(similarSequenceRow);

                if (squashBindingSites) {
                    if (simProt.bindingSites.length > 0) {
                        const id = `${dataSourceName}-${simProt.pdbId}-${simProt.chain}-bindingSites`;
                        const title = `${simProt.pdbId.toUpperCase()}'s binding sites`;

                        const bindingSitesRow = createBlockRowForBindingSites(
                            id, title, simProt.bindingSites, dataSourceName, simProtColorTransparent);
                        rowConfigData.push(bindingSitesRow);
                    }
                } else {
                    simProt.bindingSites.forEach((bindingSite, idx) => {
                        const id = `${dataSourceName}-${simProt.pdbId}-${simProt.chain}-${bindingSite.id}-${idx}`;
                        const title = bindingSite.id.toUpperCase();

                        const simProtBindingSiteRow = createBlockRowForBindingSite(
                            id, title, bindingSite, dataSourceName, simProtColorTransparent);
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

    function handleHighlight(trackData: Array<RcsbFvTrackDataElementInterface>) {
        if (trackData.length === 0) return;
        const lastElement = trackData[0].begin;

        // 100ms debounce
        setTimeout(() => {
            if (trackData && trackData.length > 0 && lastElement === trackData[0].begin) {
                const structIdx = chainResult.seqToStrMapping[lastElement - 1];
                if (structIdx) {
                    onHighlight(structIdx);
                }
            }
        }, 100);
    }

    /**
     * Method called when any element is clicked in the viewer.
     * @param trackData Data of the clicked track
     * @returns void
     */
    function elementClicked(trackData?: RcsbFvTrackDataElementInterface) {
        if (!trackData) {
            return;
        }
        const lastElement = trackData.rectBegin ?? trackData.begin;
        if (!lastElement) {
            return;
        }

        let structIdx = chainResult.seqToStrMapping[lastElement - 1];
        if (structIdx) {
            onClick(structIdx);
        }
    }
});

export default RcsbSaguaro;
