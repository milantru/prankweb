export function toBindingSiteLabel(bindingSiteId: string) {
    if (bindingSiteId.startsWith("pocket_")) {
        const [_, secondHalf] = bindingSiteId.split("_");
        return `Pocket ${secondHalf}`;
    }

    if (bindingSiteId.startsWith("pocket")) {
        return `Pocket`;
    }

    if (!bindingSiteId.includes("_")) {
        return bindingSiteId;
    }

    const [_, ligandName] = bindingSiteId.split("_");
    return ligandName.toUpperCase();
}