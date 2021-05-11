import {ObjectOf} from "@utils";

export class Timer {
    private _pool: ObjectOf<number> = {};
    fractionDigits = 2;

    get now() {
        return performance.now();
    }

    private _getTimeString(name: string) {
        const time = (this.now - this._pool[name]) / 1000;
        return time.toFixed(this.fractionDigits) + "s";
    }

    log(name: string, content: string) {
        if (content) {
            content += ": ";
        }
        console.log(`%c[Timer] ${content}${this._getTimeString(name)}`, "color:deeppink");
        return this;
    }

    start(name: string, content?: string) {
        this._pool[name] = this.now;
        if (typeof content === "string") {
            this.log(name, content);
        }
        return this;
    }

    end(name: string, content?: string) {
        if (typeof content === "string") {
            this.log(name, content);
        }
        delete this._pool[name];
        return this;
    }
}
