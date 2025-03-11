export function isNumber(value: string | number | null | undefined): boolean {
    console.log(value);
    return (!!value && !isNaN(Number(value.toString())));
}
