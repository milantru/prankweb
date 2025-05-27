export function sanitizeCode(code: string): string { // Code - either pdb or uniprot
    return code.replace(/[^0-9a-z]/gi, "").toUpperCase();
}

export function sanitizeChains(chains: string, useSpaceAsComma: boolean = false): string {
    if (useSpaceAsComma) {
        chains = chains.replace(/[ ]/gi, ",");
    }
    return chains.replace(/[^0-9a-z,]/gi, "").toUpperCase();
}

export function sanitizeSequence(sequence: string): string {
    const proteinLetters = "ACDEFGHIKLMNPQRSTVWY";
    let sanitizedSequence = "";

    sequence = sequence.toUpperCase();
    for (const c of sequence) {
        if (!proteinLetters.includes(c)) {
            continue;
        }

        sanitizedSequence += c;
    }

    return sanitizedSequence;
}

export function validatePdbCode(pdbCode: string): boolean {
    return pdbCode.length === 4 && /^[a-zA-Z0-9]*$/.test(pdbCode);
}
