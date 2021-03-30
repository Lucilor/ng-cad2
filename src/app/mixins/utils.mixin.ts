import {Constructor, ObjectOf} from "../utils/types";

export const Utils = <T extends Constructor>(base: T = class {} as T) =>
    class extends base {
        keysOf(obj: ObjectOf<any>) {
            return Object.keys(obj);
        }

        changeObjectKey(obj: ObjectOf<any>, oldKey: string, newKey: string | Event) {
            if (newKey instanceof Event) {
                const value = (newKey.target as any)?.value;
                if (typeof value === "string") {
                    newKey = value;
                } else {
                    return;
                }
            }
            const tmp = obj[oldKey];
            delete obj[oldKey];
            obj[newKey] = tmp;
        }
    };
