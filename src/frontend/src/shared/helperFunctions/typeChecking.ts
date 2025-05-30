export function isNumber(value: string | number | null | undefined): boolean {
    return (!!value && !isNaN(Number(value.toString())));
}
