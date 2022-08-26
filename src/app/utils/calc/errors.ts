export class CalcSelfReferenceError extends Error {
    constructor(public varName: string, public varValue: string) {
        super("算料公式，自引用死循环");
    }
}

export class CalcCircularReferenceError extends Error {
    constructor(public varName1: string, public varValue1: string, public varName2: string, public varValue2: string) {
        super("算料公式，互相引用死循环");
    }
}
