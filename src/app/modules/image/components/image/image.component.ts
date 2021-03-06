import {trigger, transition, style, animate} from "@angular/animations";
import {coerceBooleanProperty} from "@angular/cdk/coercion";
import {Component, ElementRef, Input, ViewChild} from "@angular/core";
import {SafeUrl} from "@angular/platform-browser";
import {timeout} from "@utils";

const imgEmpty = "assets/images/empty.jpg";
const imgLoading = "assets/images/loading.gif";

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
export class ImageComponent {
    @Input() src?: string | SafeUrl;
    @Input() bigPicSrc?: string | SafeUrl;
    private _control = false;
    @Input()
    get control() {
        return this._control;
    }
    set control(value: boolean | string) {
        this._control = coerceBooleanProperty(value);
    }
    loading = true;
    loadingSrc = imgLoading;
    emptySrc = imgEmpty;
    bigPicVisible = false;
    @ViewChild("bigPicDiv", {read: ElementRef}) bigPicDiv?: ElementRef<HTMLDivElement>;

    constructor(private elRef: ElementRef) {}

    onLoad() {
        this.loading = false;
    }

    onError() {
        this.loading = false;
        this.src = this.emptySrc;
    }

    async showBigPic() {
        if (this.bigPicSrc && this.bigPicDiv) {
            this.bigPicVisible = true;
            await timeout();
            const el = this.bigPicDiv.nativeElement;
            el.style.display = "flex";
            document.body.append(el);
        }
    }

    async hideBigPic() {
        if (this.bigPicSrc && this.bigPicDiv) {
            this.bigPicVisible = false;
            await timeout(400);
            const bpEl = this.bigPicDiv.nativeElement;
            bpEl.style.display = "none";
            this.elRef.nativeElement.append(bpEl);
        }
    }

    private _getDomMatrix(el: HTMLElement) {
        return new DOMMatrix(getComputedStyle(el).transform);
    }

    onWheel(event: WheelEvent) {
        if (!this._control) {
            return;
        }
        event.stopPropagation();
        const img = event.target as HTMLImageElement;
        const matrix = this._getDomMatrix(img);
        const scale = event.deltaY < 0 ? 1.1 : 0.9;
        const {left, top, width, height} = img.getBoundingClientRect();
        const offsetX = ((event.clientX - left) / width) * 100;
        const offsetY = ((event.clientY - top) / height) * 100;
        matrix.scaleSelf(scale);
        img.style.transform = matrix.toString();
        img.style.transformOrigin = `${offsetX}% ${offsetY}%`;
    }

    onPointerDown(event: PointerEvent) {
        if (!this._control) {
            return;
        }
        event.stopPropagation();
        const img = event.target as HTMLImageElement;
        img.setAttribute("x", event.clientX.toString());
        img.setAttribute("y", event.clientY.toString());
        const lastX = 0;
        const lastY = 0;
        const matrix = this._getDomMatrix(img);
        matrix.translateSelf(event.clientX - lastX, event.clientY - lastY);
    }

    onPointerMove(event: PointerEvent) {
        if (!this._control) {
            return;
        }
        event.stopPropagation();
        const img = event.target as HTMLImageElement;
        if (!img.hasAttribute("x") || !img.hasAttribute("y")) {
            return;
        }
        const x = parseFloat(img.getAttribute("x") || "0");
        const y = parseFloat(img.getAttribute("y") || "0");
        const matrix = this._getDomMatrix(img);
        matrix.translateSelf(event.clientX - x, event.clientY - y);
        img.style.transform = matrix.toString();
        img.setAttribute("x", event.clientX.toString());
        img.setAttribute("y", event.clientY.toString());
    }

    onPointerUp(event: PointerEvent) {
        if (!this._control) {
            return;
        }
        event.stopPropagation();
        const img = event.target as HTMLImageElement;
        img.removeAttribute("x");
        img.removeAttribute("y");
    }
}
