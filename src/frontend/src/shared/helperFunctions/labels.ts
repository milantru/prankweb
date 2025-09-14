/**
 * Converts a raw binding site identifier into a user-friendly label.
 *
 * Handles special cases like "pocket_" prefixes (e.g., "pocket_1" -> "Pocket 1") and 
 * formats ligand-based IDs (e.g., "H_so4" -> "SO4").
 *
 * @param bindingSiteId - Raw identifier of the binding site.
 * @returns A human-readable label for display purposes.
 */
export function toBindingSiteLabel(bindingSiteId: string) {
    if (bindingSiteId.startsWith("pocket_")) {
        const [_, secondHalf] = bindingSiteId.split("_");
        return `Pocket ${secondHalf}`;
    }

    if (bindingSiteId.startsWith("pocket")) {
        return "Pocket";
    }

    if (!bindingSiteId.includes("_")) {
        return bindingSiteId;
    }

    const [_, ligandName] = bindingSiteId.split("_");
    return ligandName.toUpperCase();
}