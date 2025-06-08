import chroma from "chroma-js";
import { BindingSite } from "../../pages/analytical-page/AnalyticalPage";

/**
 * Generates a color from a string using a hash function and a color scale.
 * The color is selected based on the hash value, an offset, and the desired number 
 * of distinct colors.
 *
 * @param str - The input string to hash for color generation.
 * @param offset - An integer offset to vary the resulting color, useful for shifting
 *                 the result or avoiding color collisions.
 * @param requiredColorsCount - The number of distinct colors needed; the function
 *                               will generate more internally to help reduce overlap.
 * @returns A color string selected from the chroma.js scale.
 */
function stringToColor(str: string, offset: number, requiredColorsCount: number) {
    let hash1 = 0;
    let hash2 = 0;
    for (let i = 0; i < str.length; i++) {
        hash1 = (hash1 << 5) - hash1 + str.charCodeAt(i);
        hash2 = (hash2 << 9) - hash2 + str.charCodeAt(i);
    }
    const hash = (hash1 ^ hash2) >>> 0;

    const multiplier = 2; // This is used to create more colors than is required to make it easier to find "free" color
    const color = chroma.scale("Spectral")
        .mode("lab")
        .colors(requiredColorsCount * multiplier)[(Math.abs(hash) + offset) % (requiredColorsCount * multiplier)];

    return color;
}

/**
 * Generates a unique color for each string in the given array.
 *
 * @param {string[]} uniqueStrings - An array of unique strings for which unique colors should be generated.
 * @param {number[]} [opacities=[]] - An optional array of opacities (from [0;1], e.g. [0.4, 0.2, ...])
 *                                    corresponding to each string. If provided, it must have the same length as `uniqueStrings`.
 * @param {string[]} [forbiddenColors=[]] - An optional list of colors that should be avoided.
 * @param {string[]} [baseColors=[]] - An optional array of base colors (in hex format, e.g. "#0ff1ce"),
 *                                     corresponding to each string. If provided, it must have the same length as `uniqueStrings`.
 *                                     For any entry, you may use `undefined`, `null`, or an empty string (`""`)
 *                                     to fall back to default color generation for that string.
 * 
 * @returns {Record<string, string>} - An object mapping each string to a unique color in hex format (starting with #).
 * 
 * @throws {Error} - If `opacities` or `baseColors` are provided but do not match the length of `uniqueStrings`.
 */
export function getUniqueColorForEachString(
    uniqueStrings: string[],
    opacities: number[] = [],
    forbiddenColors: string[] = [],
    baseColors: string[] = []
) {
    if (uniqueStrings.length === 0) {
        return {};
    }
    if (opacities.length > 0 && uniqueStrings.length !== opacities.length) {
        throw Error("If opacities are present, they must have the same length as the strings.");
    }
    if (baseColors.length > 0 && uniqueStrings.length !== baseColors.length) {
        throw Error("If base colors are present, they must have the same length as the strings.");
    }
    const colors: Record<string, string> = {};  // key is string (value from params), value is color in hex (with #)

    for (let i = 0; i < uniqueStrings.length; i++) {
        let str = uniqueStrings[i];
        if (str in colors) {
            continue;
        }

        const opacity = opacities.length > 0 ? opacities[i] : 1;

        let color: string;
        if (baseColors.length === uniqueStrings.length && baseColors[i]) {
            let baseColor = baseColors[i];
            color = chroma(baseColor).alpha(opacity).hex();
        } else {
            let offset = 0;
            do {
                let baseColor = stringToColor(str, offset, uniqueStrings.length + forbiddenColors.length);
                color = chroma(baseColor).alpha(opacity).hex();
                offset += 1;
            } while (Object.values(colors).some(existingColor => existingColor === color) || color in forbiddenColors);
        }

        colors[uniqueStrings[i]] = color;
    }

    return colors;
}

export function getUniqueColorForEachBindingSite(bindingSites: BindingSite[], forbiddenColors: string[], predictedPocketColor?: string) {
    const ids = [];
    const confidences = [];
    const minValue = 0.15; // Setting the min value, otherwise the lines in display are not very visible for some colors
    const baseColors = [];

    bindingSites.forEach(bindingSite => {
        ids.push(bindingSite.id);
        confidences.push(bindingSite.confidence >= minValue ? bindingSite.confidence : minValue);

        // Let's use fixed color (if provided) for predicted binding sites
        const baseColor = predictedPocketColor && bindingSite.id.startsWith("pocket")
            ? predictedPocketColor
            : null;
        baseColors.push(baseColor);
    });

    return getUniqueColorForEachString(ids, confidences, forbiddenColors);
}

export function getUniqueColorForEachDataSource(dataSourceNames: string[]) {
    const opacities = new Array(dataSourceNames.length).fill(0.05);
    return getUniqueColorForEachString(dataSourceNames, opacities);
}
