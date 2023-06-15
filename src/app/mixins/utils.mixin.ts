import {Constructor, keysOf, ObjectOf} from "@lucilor/utils";

export const Utils = <T extends Constructor>(base: T = class {} as T) =>
  class extends base {
    private _ensureArray(obj: ObjectOf<any> | undefined | null, key: string) {
      if (!obj || typeof obj !== "object") {
        return false;
      }
      if (!obj[key]) {
        obj[key] = [];
      }
      return true;
    }

    arrayAdd<K>(arr: K[], value: K, index = arr.length) {
      arr.splice(index, 0, value);
    }

    arrayAdd2<K>(source: ObjectOf<any>, key: string, value: K, index?: number) {
      if (!this._ensureArray(source, key)) {
        return;
      }
      this.arrayAdd(source[key], value, index);
    }

    arrayRemove<K>(arr: K[], index: number) {
      arr.splice(index, 1);
    }

    arrayRemove2<K>(source: ObjectOf<any>, key: string, index: number) {
      if (!this._ensureArray(source, key)) {
        return;
      }
      this.arrayRemove<K>(source[key], index);
    }

    objectAdd<K>(obj: ObjectOf<K>, value: K, key = "") {
      obj[key] = value;
    }

    objectRemove<K>(obj: ObjectOf<K>, key: string) {
      delete obj[key];
    }

    keysOf<K extends ObjectOf<any>>(obj: K) {
      return keysOf(obj);
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

    setNumberValue<K extends ObjectOf<any>>(obj: K, key: keyof K, event: Event) {
      const value = (event.target as HTMLInputElement).value;
      obj[key] = Number(value) as any;
    }
  };
