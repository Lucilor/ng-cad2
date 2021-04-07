export const DEFAULT_TOLERANCE = 0.001;

export const isNearZero = (n: number, tolerance = DEFAULT_TOLERANCE) => Math.abs(n) <= tolerance;

export const isEqual = (a: number, b: number, tolerance = DEFAULT_TOLERANCE) => isNearZero(a - b, tolerance);

export const approachZero = (n: number) => {
    if (isNearZero(n)) {
        return 0;
    }
    return n;
};

export const isBetween = (n: number, min: number, max: number, eq = true, tolerance = DEFAULT_TOLERANCE) => {
    if (min === max) {
        return eq;
    }
    if (min > max) {
        [min, max] = [max, min];
    }
    min -= tolerance;
    max += tolerance;
    if (eq) {
        return n >= min && n <= max;
    } else {
        return n > min && n < max;
    }
};
