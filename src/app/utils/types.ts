// eslint-disable-next-line no-unused-vars
export type Without<T, U> = {[P in Exclude<keyof T, keyof U>]?: never};

export type XOR<T, U> = T | U extends ObjectOf<any> ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

export type ObjectOf<T> = Record<string, T>;

export type ValueOf<T> = T[keyof T];

export type Constructor<T = ObjectOf<unknown>> = new (...args: any[]) => T;
