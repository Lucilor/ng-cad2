import {Constructor, ObjectOf} from "../utils/types";

export const Utils = <T extends Constructor>(base: T = class {} as T) =>
    class extends base {
        keysOf(obj: ObjectOf<any>) {
            return Object.keys(obj);
        }
    };
