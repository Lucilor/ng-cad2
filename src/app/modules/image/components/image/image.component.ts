import {trigger, transition, style, animate} from "@angular/animations";
import {Component, ElementRef, Input, OnInit, ViewChild} from "@angular/core";
import {SafeUrl} from "@angular/platform-browser";
import {timeout} from "@src/app/utils";

export const imgEmpty = "assets/images/empty.jpg";
export const imgLoading = "assets/images/loading.gif";

@Component({
    selector: "app-image",
    templateUrl: "./image.component.html",
    styleUrls: ["./image.component.scss"],
    animations: [
        trigger("toggle", [
            transition(":enter", [
                style({transform: "scale(0)", opacity: 0}),
                animate("0.3s", style({transform: "scale(1.2)", opacity: 1})),
                animate("0.1s", style({transform: "scale(1)"}))
            ]),
            transition(":leave", [
                style({transform: "scale(1)", opacity: 1}),
                animate("0.1s", style({transform: "scale(1.2)"})),
                animate("0.3s", style({transform: "scale(0)", opacity: 0}))
            ])
        ])
    ]
})
export class ImageComponent implements OnInit {
    @Input() width: string | number = "";
    @Input() height: string | number = "";
    @Input() src?: string | SafeUrl = "";
    @Input() bigPic: string | boolean = false;
    loading = true;
    loadingSrc = imgLoading;
    emptySrc = imgEmpty;
    bigPicVisible = false;

    @ViewChild("bigPic", {read: ElementRef}) bigPicEl?: ElementRef<HTMLDivElement>;

    constructor(private elRef: ElementRef) {}

    ngOnInit() {
        if (typeof this.width === "number") {
            this.width = this.width + "px";
        }
        if (typeof this.height === "number") {
            this.height = this.height + "px";
        }
        this.bigPic = this.bigPic !== undefined && this.bigPic !== null;
    }

    onLoad() {
        this.loading = false;
    }

    onError() {
        this.loading = false;
        this.src = this.emptySrc;
    }

    async showBigPic() {
        if (this.bigPic && this.bigPicEl) {
            this.bigPicVisible = true;
            await timeout();
            const el = this.bigPicEl.nativeElement;
            el.style.display = "flex";
            document.body.append(el);
        }
    }

    async hideBigPic() {
        if (this.bigPic && this.bigPicEl) {
            this.bigPicVisible = false;
            await timeout(400);
            const bpEl = this.bigPicEl.nativeElement;
            bpEl.style.display = "none";
            this.elRef.nativeElement.append(bpEl);
        }
    }
}
