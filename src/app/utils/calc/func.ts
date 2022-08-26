export const toFixed = (num: string | number, fractionDigits: number) => {
    num = Cast2Number(num);

    num += 0.0000001;

    const times = Math.pow(10, fractionDigits);
    const roundNum = Math.round(num * times) / times;

    let result = "";

    if (fractionDigits < 0) {
        result = roundNum.toFixed(0);
    } else {
        result = roundNum.toFixed(fractionDigits);
    }
    return result.replace(/\.0+$/, "").replace(/(\.\d+?)0+$/, "$1");
};

export const Cast2Number = (value: any): number => {
    if (typeof value === "number" && !isNaN(value)) {
        return value;
    }
    const num = Number(value);
    return !isNaN(num) ? num : parseFloat(value);
};
