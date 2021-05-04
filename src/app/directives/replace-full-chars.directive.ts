import {Directive, HostListener, Input} from "@angular/core";
import {ObjectOf, timeout} from "@lucilor/utils";

@Directive({
    selector: "[appReplaceFullChars]"
})
export class ReplaceFullCharsDirective {
    @Input() obj?: ObjectOf<string>;
    @Input() key?: string;
    @Input() arr?: string[];
    @Input() index?: number;

    constructor() {}

    @HostListener("input", ["$event"]) async onInPut(event: Event) {
        const str = (event.target as HTMLInputElement).value;
        await timeout(0);
        if (this.obj) {
            this.obj[this.key || ""] = this.replaceChars(str);
        }
        if (this.arr) {
            this.arr[this.index || 0] = this.replaceChars(str);
        }
    }

    private replaceChars(str: string) {
        const fullChars2HalfChars: ObjectOf<string> = {
            "“": '"',
            "”": '"',
            "。": ".",
            "，": ",",
            "？": "?",
            "！": "!",
            "；": ";",
            "：": ":",
            "‘": "'",
            "’": "'"
        };
        let tmp = "";
        for (const char of str) {
            if (typeof fullChars2HalfChars[char] === "string") {
                tmp += fullChars2HalfChars[char];
            } else {
                tmp += char;
            }
        }
        return tmp;
    }
}
