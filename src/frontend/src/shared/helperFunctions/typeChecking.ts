/** Checks whether provided value is a number. */
export function isNumber(value: string | number | null | undefined): boolean {
    return (!!value && !isNaN(Number(value.toString())));
}
