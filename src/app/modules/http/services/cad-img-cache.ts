import {local} from "@app/app.common";
import {ObjectOf} from "@utils";

export interface CadImgCacheItem {
    url: string;
    time: number;
}

export class CadImgCache {
    cacheKey = "cadImgCache";
    cacheDuration = 300000;

    private _loadCache() {
        return local.load<ObjectOf<CadImgCacheItem>>(this.cacheKey) || {};
    }

    private _saveCache(cache: ObjectOf<any>) {
        local.save(this.cacheKey, cache);
    }

    public get(key: string) {
        const item = this._loadCache()[key];
        if (!item) {
            return null;
        }
        const {url, time} = item;
        if (new Date().getTime() - time < this.cacheDuration) {
            return url;
        }
        return null;
    }

    public set(key: string, url: string) {
        const cache = this._loadCache();
        cache[key] = {url, time: new Date().getTime()};
        this._saveCache(cache);
    }

    public remove(key: string) {
        const cache = this._loadCache();
        delete cache[key];
        this._saveCache(cache);
    }
}
