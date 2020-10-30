export type Without<T, U> = {[P in Exclude<keyof T, keyof U>]?: never};

export type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

export type AnyObject = {[key: string]: any};

export type Nullable<T> = T | null | undefined;

export type ValueOf<T> = T[keyof T];

export type Constructor<T = {}> = new (...args: any[]) => T;
