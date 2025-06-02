import chroma from "chroma-js";
import { BindingSite } from "../../pages/analytical-page/AnalyticalPage";

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
 * @param {string[]} [baseColors=[]] - An optional array of base colors (in hex format, e.g. "#0ff1ce"),
 *                                     corresponding to each string. If provided, it must have the same length as `strings`.
 *                                     For any entry, you may use `undefined`, `null`, or an empty string (`""`)
 *                                     to fall back to default color generation for that string.
 * 
 * @returns {Record<string, string>} - An object mapping each string to a unique color in hex format (starting with #).
 * 
 * @throws {Error} - If `opacities` or `baseColors` are provided but do not match the length of `strings`.
 */
export function getUniqueColorForEachString(
    strings: string[],
    opacities: number[] = [],
    forbiddenColors: string[] = [],
    baseColors: string[] = []
) {
    if (strings.length === 0) {
        return {};
    }
    if (opacities.length > 0 && strings.length !== opacities.length) {
        throw Error("If opacities are present, they must have the same length as the strings.");
    }
    if (baseColors.length > 0 && strings.length !== baseColors.length) {
        throw Error("If base colors are present, they must have the same length as the strings.");
    }
    const colors: Record<string, string> = {};  // key is string (value from params), value is color in hex (with #)

    for (let i = 0; i < strings.length; i++) {
        let str = strings[i];
        if (str in colors) {
            continue;
        }

        const opacity = opacities.length > 0 ? opacities[i] : 1;

        let color: string;
        if (baseColors.length === strings.length && baseColors[i]) {
            let baseColor = baseColors[i];
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
