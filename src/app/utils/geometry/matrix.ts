export type PointLike = number | number[] | {x: number; y: number};

export interface MatrixParams {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
    translate: PointLike;
    scale: PointLike;
    skew: PointLike;
    rotate: number;
    origin: PointLike;
}

export type MatrixLike = Matrix | number[] | Partial<MatrixParams>;

type MatrixKey = "a" | "b" | "c" | "d" | "e" | "f";

const matrixKeys: MatrixKey[] = ["a", "b", "c", "d", "e", "f"];
const matrixValues: Record<MatrixKey, number> = {a: 1, b: 0, c: 0, d: 1, e: 0, f: 0};

function getPoint(source?: PointLike, defaultValue = 0) {
    let x = defaultValue;
    let y = defaultValue;
    if (typeof source === "number") {
        x = y = source;
    } else if (Array.isArray(source)) {
        x = Number(source[0]);
        y = Number(source[1]);
    } else if (typeof source === "object") {
        x = Number(source.x);
        y = Number(source.y);
    }
    if (isNaN(x)) {
        x = 0;
    }
    if (isNaN(y)) {
        y = 0;
    }
    return [x, y];
}

export class Matrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    origin = [0, 0];

    constructor(source?: MatrixLike) {
        if (source) {
            this.compose(source);
        }
    }

    compose(source: MatrixLike) {
        if (Array.isArray(source)) {
            matrixKeys.forEach((k, i) => {
                this[k] = source[i] ?? matrixValues[k];
            });
        } else if (typeof source === "object") {
            matrixKeys.forEach((k) => {
                this[k] = source[k] ?? matrixValues[k];
            });
            this.origin = getPoint(source.origin);
            if (!(source instanceof Matrix)) {
                if (source.translate !== undefined) {
                    const translate = getPoint(source.translate);
                    this.translate(translate[0], translate[1]);
                }
                if (source.scale !== undefined) {
                    const scale = getPoint(source.scale, 1);
                    this.scale(scale[0], scale[1]);
                }
                if (source.skew !== undefined) {
                    const skew = getPoint(source.skew);
                    this.skew(skew[0], skew[1]);
                }
                const rotate = Number(source.rotate);
                if (!isNaN(rotate)) {
                    this.rotate(rotate);
                }
            }
        }
    }

    decompose() {
        const result = {} as MatrixParams;
        matrixKeys.forEach((k) => {
            result[k] = this[k];
        });
        result.origin = this.origin.slice();
        result.rotate = this.rotate();
        result.scale = this.scale();
        result.skew = this.skew();
        result.translate = this.translate();
        return result;
    }

    toArray() {
        const result: number[] = [];
        matrixKeys.forEach((k) => {
            result.push(this[k]);
        });
        return result;
    }

    transform(matrix: MatrixLike) {
        matrix = new Matrix(matrix);
        this.a *= matrix.a;
        this.d *= matrix.d;
        this.e += matrix.e;
        this.f += matrix.f;
        const skew1 = this.skew();
        const skew2 = matrix.skew();
        this.skew(skew1[0] + skew2[0], skew1[1] + skew2[1]);
        return this;
    }

    scale(): number[];
    scale(x: number, y?: number): this;
    scale(x?: number, y = x) {
        if (typeof x !== "number" || typeof y !== "number") {
            return [this.a, this.d];
        }
        this.a = x;
        this.d = y;
        return this;
    }

    translate(): number[];
    translate(x: number, y?: number): this;
    translate(x?: number, y = x) {
        if (typeof x !== "number" || typeof y !== "number") {
            return [this.e, this.f];
        }
        this.e = x;
        this.f = y;
        return this;
    }

    skew(): number[];
    skew(radX?: number, radY?: number): this;
    skew(radX?: number, radY = radX) {
        if (typeof radX !== "number" || typeof radY !== "number") {
            return [Math.atan(this.b), Math.atan(this.c)];
        }
        this.b = Math.tan(radX);
        this.c = Math.tan(radY);
        return this;
    }

    rotate(): number;
    rotate(rad: number): this;
    rotate(rad?: number) {
        if (typeof rad === "number") {
            this.a = Math.cos(rad);
            this.d = this.a;
            this.b = Math.sin(rad);
            this.c = -this.b;
            return this;
        }
        if (this.a !== this.d || this.b !== -this.c) {
            return 0;
        }
        return Math.acos(this.a);
    }
}
