import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { RcsbFv, RcsbFvTrackDataElementInterface, RcsbFvBoardConfigInterface, RcsbFvRowExtendedConfigInterface, RcsbFvTooltipInterface } from "@rcsb/rcsb-saguaro";
import { BindingSite, ChainResult, Conservation } from "../AnalyticalPage";
import { getUniqueColorForEachBindingSite, getUniqueColorForEachDataSource, getUniqueColorForEachString } from "../../../shared/helperFunctions/colors";
import { toBindingSiteLabel } from "../../../shared/helperFunctions/labels";
import chroma from "chroma-js";

export type RcsbSaguaroHandle = {
    getRcsbPlugin: () => RcsbFv | null;
    getOffset: () => number;
};

type RcsbPositionData = { // This will be stored (serialized to string) in label of track data
    position?: number;
    residue?: string;
    bindingSiteId?: string;
    confidence?: number;
    conservationValue?: number;
    dataSourceName?: string;
    pdbCode?: string;
    chain?: string;
};

type Props = {
    classes?: string;
    chainResult: ChainResult;
    dataSourceDisplayNames: Record<string, string>;
    squashBindingSites: boolean;
    startQuerySequenceAtZero: boolean;
    onHighlight: (structureIndices: number[], dataSourceName?: string, pdbCode?: string, chain?: string) => void;
    onClick: (structureIndices: number[], dataSourceName?: string, pdbCode?: string, chain?: string) => void;
};

const RcsbSaguaro = forwardRef(({
    classes = "",
    chainResult,
    dataSourceDisplayNames,
    squashBindingSites,
    startQuerySequenceAtZero,
    onHighlight,
    onClick
}: Props, ref) => {
    // ID of the DOM element where the plugin is placed
    const elementId = "application-rcsb";
    const predictedPocketColor = "#00aa00";
    const defaultTitleFlagColor = "lightgrey"
    /* If query seq is set to start at 0, it means some sequences might 
     * be in negative numbers on board. */
    const [rcsbFv, setRcsbFv] = useState<RcsbFv>(null);
    const [colorsInitialized, setColorsInitialized] = useState<boolean>(false);
    const dataSourcesColors = useRef<Record<string, string>>(null!); // dataSourcesColors[dataSourceName] -> color in hex, e.g. #0ff1ce
    const bindingSitesColors = useRef<Record<string, string>>(null!); // bindingSitesColors[bindingSiteId] -> color in hex, e.g. #0ff1ce
    const similarProteinsColors = useRef<Record<string, string>>(null!); // similarProteinsColors[pdbId] -> color in hex, e.g. #0ff1ce
    const isFirstRender = useRef(true);
    const offset = useRef(0); // Used for "Start query sequence at 0" feature

    useImperativeHandle(ref, () => ({
        getRcsbPlugin,
        getOffset
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
            <div className="w-75 d-flex flex-wrap my-3 mx-auto p-2 border justify-content-center align-items-center">
                {colorsInitialized && Object.keys(chainResult.dataSourceExecutorResults).map(dataSourceName => (
                    <div key={dataSourceName} className="d-flex align-items-center mr-3">
                        <span className="mr-2"
                            style={{
                                width: "40px",
                                height: "20px",
                                backgroundColor: chroma(dataSourcesColors.current[dataSourceName]).alpha(0.175).css(),
                                display: "inline-block",
                                border: "1px solid #ccc",
                            }} />
                        <span>{dataSourceDisplayNames[dataSourceName]}</span>
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
        bindingSitesColors.current = getUniqueColorForEachBindingSite([...new Set(allBindingSites)], forbiddenColors, predictedPocketColor);

        // Colors for similar proteins
        const allSimilarProteinIds: string[] = [];
        for (const result of Object.values(chainResult.dataSourceExecutorResults)) {
            if (!result.similarProteins) {
                continue;
            }
            result.similarProteins.forEach(simProt => allSimilarProteinIds.push(simProt.pdbId));
        }
        similarProteinsColors.current = getUniqueColorForEachString([...new Set(allSimilarProteinIds)], [], [defaultTitleFlagColor]);
        setColorsInitialized(true);
    }

    function initBoard() {
        if (startQuerySequenceAtZero) {
            const querySequenceStartIdx = getSequenceStartIndex(chainResult.querySequence);
            /* +1 is here to "negate" +1 which we use when visualissing items
             * (We use +1 when visualising items because it seems rcsb saguaro 
             * expects sequence to start from 1 and not from 0; UPDATE: This may not be truth, not confirmed though.).*/
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

    function getOffset(): number {
        return offset.current;
    }

    /**
     * Creates board configuration for RCSB-saguaro viewer,
     * tailored to integrate with the Mol* visualization to:
     * - Highlight hovered residues or binding sites in the Mol* 3D viewer.
     * - When clicked on the residue or binding site, it is focused by the Mol*.
     *
     * @param chainResult - The result object containing the query sequence used to compute the board's range.
     * @returns A fully configured RcsbFvBoardConfigInterface object for rendering the sequence viewer and synchronizing with Mol*.
     */
    function createBoardConfigData(chainResult: ChainResult) {
        const tooltipGenerator: RcsbFvTooltipInterface = {
            showTooltip: (d: RcsbFvTrackDataElementInterface): HTMLElement | undefined => {
                if (d.label && d.label.length === 1) {
                    /* Sometimes can happen that label from sequence track comes, we skip it,
                     * we wait for our label with JSON. */
                    return;
                }

                const tooltipDiv = document.createElement("div");
                let tooltipHtml = "";

                if (!d.label || (d.label && !d.label.includes("position"))) {
                    tooltipHtml += `<strong>Position:</strong> ${d.begin}${d.end ? ` - ${d.end}` : ""}`;
                }
                if (d.label) {
                    const positionData: RcsbPositionData = JSON.parse(d.label);
                    if (positionData.position) {
                        tooltipHtml += `<strong>Position:</strong> ${positionData.position}`;
                    }
                    if (positionData.residue) {
                        tooltipHtml += ` | ${positionData.residue}`;
                    }
                    if (squashBindingSites && positionData.bindingSiteId) {
                        tooltipHtml += ` | <strong>Name:</strong> ${toBindingSiteLabel(positionData.bindingSiteId)}`;
                    }
                    if (positionData.confidence) {
                        tooltipHtml += ` | <strong>Probability:</strong> ${positionData.confidence.toFixed(2)}`;
                    }
                    if (positionData.dataSourceName) {
                        tooltipHtml += ` | <strong>Source:</strong> ${dataSourceDisplayNames[positionData.dataSourceName]}`;
                    }
                    if (positionData.conservationValue) {
                        tooltipHtml += ` | <strong>Value:</strong> ${positionData.conservationValue.toFixed(2)}`;
                    }
                }
                tooltipDiv.innerHTML = tooltipHtml;

                return tooltipDiv;
            }
        };

        const boardConfigData: RcsbFvBoardConfigInterface = {
            range: {
                min: 0 - offset.current,
                max: chainResult.querySequence.length - offset.current
            },
            includeAxis: true,
            highlightHoverPosition: false,
            highlightHoverElement: true, // This must be true in order to get label from trackData in hover handling (label is not there if false)
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

    function toTrackDataItem(
        bindingSite: BindingSite,
        color: string,
        dataSourceName: string,
        pdbCode?: string,
        chain?: string
    ): RcsbFvTrackDataElementInterface {
        const residues = [...bindingSite.residues];
        if (residues.length === 0) {
            return {};
        }

        const positionData: RcsbPositionData = {
            bindingSiteId: bindingSite.id,
            confidence: bindingSite.confidence,
            dataSourceName: dataSourceName,
            pdbCode: pdbCode,
            chain: chain
        };

        if (residues.length === 1) {
            const trackDataItem: RcsbFvTrackDataElementInterface = {
                begin: residues[0].sequenceIndex + 1 - offset.current,
                end: residues[0].sequenceIndex + 1 - offset.current,
                gaps: [],
                color: color,
                label: JSON.stringify(positionData)
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
            label: JSON.stringify(positionData)
        };
        return trackDataItem;
    }

    function createQuerySequenceRow(querySequence: string, pdbId: string | null = null) {
        const displayData: RcsbFvTrackDataElementInterface[] = [];
        for (let i = 0; i < querySequence.length; i++) {
            const position = i + 1 - offset.current;
            const positionData: RcsbPositionData = {
                // offset is added to get "real" position, not the one after "start at 0" feature is on
                position: position + offset.current,
                residue: querySequence[i]
            }

            displayData.push({
                begin: position,
                end: position,
                label: JSON.stringify(positionData)
            });
        }

        const trackColor = "#F9F9F9";

        const querySequenceRow: RcsbFvRowExtendedConfigInterface = {
            trackId: "query-seq",
            trackHeight: 20,
            trackColor: trackColor,
            displayType: "composite",
            nonEmptyDisplay: true,
            rowTitle: pdbId ?? "Query sequence",
            titleFlagColor: defaultTitleFlagColor,
            displayConfig: [
                {
                    displayType: "sequence",
                    displayColor: "#000000",
                    overlap: false,
                    displayId: "composite-sequence-query-seq",
                    displayData: [
                        {
                            begin: 1 - offset.current,
                            label: querySequence
                        }
                    ]
                },
                {
                    // block must come AFTER sequence, otherwise it might be problem for user co click it (we wouldn't get label)
                    displayType: "block",
                    displayColor: "#FFFFFF00",
                    /* ids of composite blocks must start with "special-composite", 
                     * otherwise styles won't look nice, for more info read comments in index.css */
                    displayId: "special-composite-block-query-seq",
                    displayData: displayData
                }
            ]
        };

        return querySequenceRow;
    }

    function createConservationRow(conservations: Conservation[]) {
        const max = Math.max(...conservations.map(conservation => conservation.value));

        const conservationData = conservations.map(conservation => {
            const positionData: RcsbPositionData = {
                conservationValue: conservation.value
            };

            return {
                begin: conservation.index + 1 - offset.current,
                value: conservation.value / max, // normalization
                label: JSON.stringify(positionData)
            };
        });

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
        titleFlagColor: string,
        dataSourceName: string,
        pdbCode?: string,
        chain?: string,
    ) {
        const displayData: RcsbFvTrackDataElementInterface[] = [];
        for (let i = 0; i < sequence.length; i++) {
            const position = i + 1 - offset.current;
            const positionData: RcsbPositionData = {
                // offset is added to get "real" position, not the one after "start at 0" feature is on
                position: position + offset.current,
                residue: sequence[i],
                dataSourceName: dataSourceName,
                pdbCode: pdbCode,
                chain: chain
            }

            displayData.push({
                begin: position,
                end: position,
                label: JSON.stringify(positionData)
            });
        }

        const similarSequenceRow: RcsbFvRowExtendedConfigInterface = {
            trackId: id,
            trackHeight: 20,
            trackColor: dataSourcesColors.current[dataSourceName],
            displayType: "composite",
            nonEmptyDisplay: true,
            rowTitle: title,
            titleFlagColor: titleFlagColor,
            displayConfig: [
                {
                    displayType: "sequence",
                    displayColor: "#000000",
                    displayId: `composite-sequence-${id}`,
                    displayData: [
                        {
                            begin: 1 - offset.current,
                            label: sequence
                        }
                    ]
                },
                {
                    // block must come AFTER sequence, otherwise it might be problem for user co click it (we wouldn't get label)
                    displayType: "block",
                    displayColor: "#FFFFFF00",
                    /* ids of composite blocks must start with "special-composite", 
                     * otherwise styles won't look nice, for more info read comments in index.css */
                    displayId: `special-composite-block-${id}`,
                    displayData: displayData
                }
            ]
        };

        return similarSequenceRow;
    }

    function createBlockRowForBindingSite(
        id: string,
        title: string,
        bindingSite: BindingSite,
        dataSourceName: string,
        pdbCode?: string,
        chain?: string,
        titleFlagColor?: string,
    ) {
        const trackDataItem = toTrackDataItem(bindingSite, bindingSitesColors.current[bindingSite.id], dataSourceName, pdbCode, chain);

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
        pdbCode?: string,
        chain?: string,
        titleFlagColor?: string,
    ) {
        const trackData = bindingSites.map(bindingSite =>
            toTrackDataItem(bindingSite, bindingSitesColors.current[bindingSite.id], dataSourceName, pdbCode, chain));

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
                        id, title, result.bindingSites, dataSourceName, undefined, undefined, defaultTitleFlagColor)
                    rowConfigData.push(bindingSitesRow);
                }
            } else {
                result.bindingSites.forEach((bindingSite, idx) => {
                    const id = `${dataSourceName}-${bindingSite.id}-${idx}`;
                    const title = toBindingSiteLabel(bindingSite.id);

                    const bindingSiteRow = createBlockRowForBindingSite(
                        id, title, bindingSite, dataSourceName, undefined, undefined, defaultTitleFlagColor);
                    rowConfigData.push(bindingSiteRow)
                });
            }

            if (!result.similarProteins) {
                continue;
            }
            const similarProteins = [...result.similarProteins];

            // Sort similar proteins by TM score
            similarProteins.sort((a, b) => b.tmScore - a.tmScore);

            for (const simProt of similarProteins) {
                const id = `${dataSourceName}-${simProt.pdbId}-${simProt.chain}`;
                const title = `${simProt.pdbId.toUpperCase()} (${simProt.chain})`;
                const simProtColor = similarProteinsColors.current[simProt.pdbId];
                const simProtColorTransparent = simProtColor + "80"; // Add alpha channel

                const similarSequenceRow = createSimilarSequenceRow(
                    id, title, simProt.sequence, simProtColor, dataSourceName, simProt.pdbId, simProt.chain);
                rowConfigData.push(similarSequenceRow);

                if (squashBindingSites) {
                    if (simProt.bindingSites.length > 0) {
                        const id = `${dataSourceName}-${simProt.pdbId}-${simProt.chain}-bindingSites`;
                        const title = `${simProt.pdbId.toUpperCase()}'s binding sites`;

                        const bindingSitesRow = createBlockRowForBindingSites(
                            id, title, simProt.bindingSites, dataSourceName, simProt.pdbId, simProt.chain, simProtColorTransparent);
                        rowConfigData.push(bindingSitesRow);
                    }
                } else {
                    simProt.bindingSites.forEach((bindingSite, idx) => {
                        const id = `${dataSourceName}-${simProt.pdbId}-${simProt.chain}-${bindingSite.id}-${idx}`;
                        const title = toBindingSiteLabel(bindingSite.id);

                        const simProtBindingSiteRow = createBlockRowForBindingSite(
                            id, title, bindingSite, dataSourceName, simProt.pdbId, simProt.chain, simProtColorTransparent);
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

    function tryGetRcsbPosition(
        trackData: RcsbFvTrackDataElementInterface
    ): { isSuccess: boolean, position: number | null, positionData: RcsbPositionData | null } {
        if (trackData.label && trackData.label.length === 1) {
            /* Sometimes might(?) happen that label from sequence track comes, we skip it,
             * we wait for our label with JSON. I'm not sure whether this can happend here, 
             * but I will put this if here due to defensive programming. */
            return { isSuccess: false, position: null, positionData: null };
        }
        let position: number | null = null;
        let positionData: RcsbPositionData | null = null;
        if (!trackData.label || (trackData.label && !trackData.label.includes("position"))) {
            position = trackData.rectBegin ?? trackData.begin;
        } else if (trackData.label) { // Try to get position from label
            positionData = JSON.parse(trackData.label);
            position = positionData.position;
        }
        if (position === null) {
            position = trackData.rectBegin ?? trackData.begin;
        }

        if (position === null || position === undefined) { // This should not happen, but this check was in Prankweb, so better be careful
            return { isSuccess: false, position: null, positionData: null };
        }

        return { isSuccess: true, position, positionData };
    }

    /**
     * Calculates the original (unaligned) sequence index corresponding to a given position
     * in an aligned sequence used by the RCSB viewer.
     * 
     * The RCSB viewer position (1-based) corresponds to a residue position in the aligned sequence,
     * which may include gaps ("-"). This function converts that aligned position into the
     * 0-based index of the residue in the original, unaligned sequence.
     * 
     * If the specified position corresponds to a gap in the alignment, or the provided sequence
     * contains no amino acids, the function returns -1.
     * 
     * @param sequenceWithGaps - The aligned sequence containing gaps, where gaps are represented by "-".
     * @param rcsbPosition - The 1-based position from the RCSB viewer (aligned sequence position).
     * @returns The 0-based index of the corresponding residue in the unaligned sequence,
     *          or -1 if the position corresponds to a gap, or if the provided sequence contained no amino acids.
     */
    function getSeqIdxBeforeAligning(sequenceWithGaps: string, rcsbPosition: number) {
        const seqIdx = rcsbPosition - 1;
        let seqIdxCounter = -1;
        if (sequenceWithGaps[seqIdx] === "-") {
            // We don't want to focus when clicked on gap
            return seqIdxCounter;
        }

        for (let i = 0; i <= seqIdx && i < sequenceWithGaps.length; i++) {
            const aminoAcidOrGap = sequenceWithGaps[i];
            if (aminoAcidOrGap === "-") {
                continue;
            }
            seqIdxCounter++;
        }

        return seqIdxCounter;
    }

    function getStructIdx(positionData: RcsbPositionData, position: number): number | undefined {
        let structIdx: number = null!;

        if (positionData?.dataSourceName && positionData?.pdbCode && positionData?.chain) {
            // Similar protein (or binding site on it) is clicked/hovered, lets find the protein and use its seq to str mapping
            const simProts = chainResult.dataSourceExecutorResults[positionData.dataSourceName].similarProteins;
            const simProt = simProts.find(x => x.pdbId === positionData.pdbCode && x.chain === positionData.chain);

            let seqIdxBeforeAligning = getSeqIdxBeforeAligning(simProt.sequence, position);
            structIdx = simProt.seqToStrMapping[seqIdxBeforeAligning];
        } else {
            // Query protein (or binding site on it) is clicked/hovered
            let seqIdxBeforeAligning = getSeqIdxBeforeAligning(chainResult.querySequence, position);
            structIdx = chainResult.querySeqToStrMapping[seqIdxBeforeAligning];
        }

        return structIdx;
    }

    function handleHighlight(trackData: Array<RcsbFvTrackDataElementInterface>) {
        if (trackData.length === 0) {
            return;
        }
        const lastElement = trackData[0].begin;

        // 100ms debounce
        setTimeout(() => {
            if (trackData && trackData.length > 0 && lastElement === trackData[0].begin) {
                const { isSuccess, position, positionData } = tryGetRcsbPosition(trackData[0]);
                if (!isSuccess) {
                    return;
                }

                let structIdx = getStructIdx(positionData, position);
                if (structIdx) {
                    onHighlight([structIdx], positionData?.dataSourceName, positionData?.pdbCode, positionData?.chain);
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

        const { isSuccess, position, positionData } = tryGetRcsbPosition(trackData);
        if (!isSuccess) {
            return;
        }

        let structIdx = getStructIdx(positionData, position);
        if (structIdx) {
            onClick([structIdx], positionData?.dataSourceName, positionData?.pdbCode, positionData?.chain);
        }
    }
});

export default RcsbSaguaro;
