import {Directive, HostListener, Input} from "@angular/core";
import {replaceChars} from "@app/app.common";
import {ObjectOf, timeout} from "@utils";

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
        return replaceChars(str);
    }
}
