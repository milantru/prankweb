/**
 * Sanitizes a PDB or UniProt code by removing all non-alphanumeric characters and converting to uppercase.
 *
 * @param code - The input code to sanitize.
 * @returns A cleaned, uppercase string containing only letters and digits.
 */
export function sanitizeCode(code: string): string {
    return code.replace(/[^0-9a-z]/gi, "").toUpperCase();
}

/**
 * Sanitizes a list of chain identifiers by removing invalid characters and converting to uppercase.
 *
 * Optionally replaces spaces with commas before cleaning.
 *
 * @param chains - Input string containing chain identifiers.
 * @param useSpaceAsComma - If true, replaces spaces with commas before sanitization.
 * @returns A cleaned, comma-separated, uppercase string of chain identifiers.
 */
export function sanitizeChains(chains: string, useSpaceAsComma: boolean = false): string {
    if (useSpaceAsComma) {
        chains = chains.replace(/[ ]/gi, ",");
    }
    return chains.replace(/[^0-9a-z,]/gi, "").toUpperCase();
}

/**
 * Sanitizes a protein sequence by removing any non-standard amino acid characters.
 *
 * @param sequence - The input protein sequence.
 * @returns A cleaned protein sequence string containing only valid amino acid codes.
 */
export function sanitizeSequence(sequence: string): string {
    const aminoAcidLetters = "ACDEFGHIKLMNPQRSTVWY";
    let sanitizedSequence = "";

    sequence = sequence.toUpperCase();
    for (const c of sequence) {
        if (!aminoAcidLetters.includes(c)) {
            continue;
        }

        sanitizedSequence += c;
    }

    return sanitizedSequence;
}

/**
 * Validates a PDB code by checking that it consists of exactly 4 alphanumeric characters.
 *
 * @param pdbCode - The PDB code to validate.
 * @returns True if valid, false otherwise.
 */
export function validatePdbCode(pdbCode: string): boolean {
    return pdbCode.length === 4 && /^[a-zA-Z0-9]*$/.test(pdbCode);
}
