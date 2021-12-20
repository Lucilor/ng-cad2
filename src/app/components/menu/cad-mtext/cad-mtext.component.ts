import {Component, OnInit, OnDestroy} from "@angular/core";
import {CadData, CadEntity, CadMtext, ColoredObject} from "@cad-viewer";
import {AnchorEvent} from "@components/anchor-selector/anchor-selector.component";
import {Subscribed} from "@mixins/subscribed.mixin";
import {AppStatusService} from "@services/app-status.service";
import {Point} from "@utils";
import {debounce} from "lodash";
import {ColorEvent} from "ngx-color";

@Component({
    selector: "app-cad-mtext",
    templateUrl: "./cad-mtext.component.html",
    styleUrls: ["./cad-mtext.component.scss"]
})
export class CadMtextComponent extends Subscribed() implements OnInit, OnDestroy {
    data?: CadData;
    selected: CadMtext[] = [];
    currAnchor = new Point();
    private _colorText = "";
    colorValue = "";
    colorBg = "";
    get colorText() {
        return this._colorText;
    }
    set colorText(value) {
        this._colorText = value.toUpperCase();
        try {
            const c = new ColoredObject(value);
            if (c.getColor().isLight()) {
                this.colorBg = "black";
            } else {
                this.colorBg = "white";
            }
            this.colorValue = value;
        } catch (error) {
            this.colorValue = "black";
            this.colorBg = "white";
        }
    }

    constructor(private status: AppStatusService) {
        super();
    }

    ngOnInit() {
        this.subscribe(this.status.selectedCads$, () => {
            this.data = this.status.getFlatSelectedCads()[0];
        });
        this._updateSelected();
        const cad = this.status.cad;
        cad.on("entitiesselect", this._updateSelected);
        cad.on("entitiesunselect", this._updateSelected);
        cad.on("entitiesadd", this._updateSelected);
        cad.on("entitiesremove", this._updateSelected);
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        const cad = this.status.cad;
        cad.off("entitiesselect", this._updateSelected);
        cad.off("entitiesunselect", this._updateSelected);
        cad.off("entitiesadd", this._updateSelected);
        cad.off("entitiesremove", this._updateSelected);
    }

    private _updateSelected = () => {
        this.selected = this.status.cad.selected().mtext;
        this.colorText = this.getColor();
    };

    getInfo(field: string) {
        const selected = this.selected;
        if (selected.length === 1) {
            return (selected[0] as any)[field];
        }
        if (selected.length) {
            const texts = Array.from(new Set(selected.map((v: any) => v[field])));
            if (texts.length === 1) {
                return texts[0];
            }
            return "多个值";
        }
        return "";
    }

    // eslint-disable-next-line @typescript-eslint/member-ordering
    setInfo = debounce((field: string, event: Event) => {
        const value = (event.target as HTMLInputElement).value;
        this.selected.forEach((e: any) => (e[field] = value));
        this.status.cad.render(this.selected);
    }, 500);

    getColor() {
        const selected = this.selected;
        let color = "";
        if (selected.length === 1) {
            color = selected[0].getColor().hex();
        } else if (selected.length) {
            const texts = Array.from(new Set(selected.map((v) => v.getColor().hex())));
            if (texts.length === 1) {
                color = texts[0];
            } else {
                return "多个值";
            }
        }
        return color;
    }

    setColor(event: ColorEvent) {
        const value = event.color.hex;
        this.selected.forEach((e) => e.setColor(value));
        this.status.cad.render(this.selected);
        this.colorText = value;
    }

    addMtext() {
        const cad = this.status.cad;
        const mtext = new CadMtext();
        const {cx, cy} = cad.draw.viewbox();
        mtext.insert.set(cx, cy);
        mtext.anchor.set(0, 0);
        mtext.text = "新建文本";
        mtext.selected = true;
        this.data?.entities.mtext.push(mtext);
        cad.render(mtext);
    }

    async cloneMtexts() {
        const cad = this.status.cad;
        const toRender: CadEntity[] = [];
        this.selected.forEach((mtext) => {
            const newText = mtext.clone(true);
            this.data?.entities.mtext.push(newText);
            toRender.push(newText);
        });
        cad.render(toRender);
    }

    getAnchor() {
        const selected = this.selected;
        const anchor = new Point();
        if (selected.length === 1) {
            anchor.copy(selected[0].anchor);
        }
        this.currAnchor.copy(anchor);
        return anchor.toArray().join(", ");
    }

    setAnchor(event: AnchorEvent) {
        const [x, y] = event.anchor;
        this.selected.forEach((e) => e.anchor.set(x, y));
        this.status.cad.render(this.selected);
    }
}
