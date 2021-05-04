import {Constructor, ObjectOf} from "@lucilor/utils";

export const Utils = <T extends Constructor>(base: T = class {} as T) =>
    class extends base {
        arrayAdd<K>(arr: K[], value: K, index = arr.length) {
            arr.splice(index, 0, value);
        }

        arrayRemove<K>(arr: K[], index: number) {
            arr.splice(index, 1);
        }

        objectAdd<K>(obj: ObjectOf<K>, value: K, key = "") {
            obj[key] = value;
        }

        objectRemove<K>(obj: ObjectOf<K>, key: string) {
            delete obj[key];
        }

        keysOf<K>(obj: ObjectOf<K>) {
            return Object.keys(obj);
        }

        changeObjectKey<K>(obj: ObjectOf<K>, oldKey: string, newKey: string | Event) {
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
