import {AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild} from "@angular/core";
import {CadConsoleComponent} from "@src/app/modules/cad-console/components/cad-console/cad-console.component";
import {CadConsoleService} from "@src/app/modules/cad-console/services/cad-console.service";
import {AppConfigService} from "@src/app/services/app-config.service";
import {AppStatusService, cadStatusNameMap} from "@src/app/services/app-status.service";
import {Subscribed} from "@src/app/mixins/Subscribed.mixin";
import {debounce} from "lodash";
import {trigger, state, style, transition, animate} from "@angular/animations";
import {ContextMenu} from "@src/app/mixins/ContextMenu.mixin";
import {MatMenuTrigger} from "@angular/material/menu";
import {MatTabChangeEvent, MatTabGroup} from "@angular/material/tabs";
import {ActivatedRoute} from "@angular/router";
import {CadData} from "@src/app/cad-viewer";
import {CadDataService, GetCadParams} from "@src/app/modules/http/services/cad-data.service";

@Component({
    selector: "app-index",
    templateUrl: "./index.component.html",
    styleUrls: ["./index.component.scss"],
    animations: [
        trigger("closeTop", [
            state("open", style({transform: "translateY(0)"})),
            state("closed", style({transform: "translateY(-100%)"})),
            transition("open <=> closed", [animate("0.3s")])
        ]),
        trigger("closeRight", [
            state("open", style({transform: "translateX(0)"})),
            state("closed", style({transform: "translateX(100%)"})),
            transition("open <=> closed", [animate("0.3s")])
        ]),
        trigger("closeBottom", [
            state("open", style({transform: "translateY(0)"})),
            state("closed", style({transform: "translateY(100%)"})),
            transition("open <=> closed", [animate("0.3s")])
        ]),
        trigger("closeLeft", [
            state("open", style({transform: "translateX(0)"})),
            state("closed", style({transform: "translateX(-100%)"})),
            transition("open <=> closed", [animate("0.3s")])
        ])
    ]
})
export class IndexComponent extends ContextMenu(Subscribed()) implements OnInit, AfterViewInit, OnDestroy {
    menuPadding = [40, 270, 20, 220];
    shownMenus: ("cadInfo" | "entityInfo" | "cadAssemble")[] = ["cadInfo", "entityInfo"];
    showTopMenu = true;
    showRightMenu = true;
    showBottomMenu = true;
    showLeftMenu = true;
    showAllMenu = true;
    loaderId = "saveCadLoader";
    tabIndex = 0;

    get multiSelect() {
        return this.status.cad.config("selectMode") === "multiple";
    }

    get cadStatusStr() {
        let result = cadStatusNameMap[this.status.cadStatus$.getValue().name];
        if (!this.config.config("enableZoom")) {
            result += "(禁用缩放)";
        }
        return result;
    }

    @ViewChild("cadContainer", {read: ElementRef}) cadContainer?: ElementRef<HTMLElement>;
    @ViewChild(CadConsoleComponent) consoleComponent?: CadConsoleComponent;
    @ViewChild(MatMenuTrigger) contextMenu?: MatMenuTrigger;
    @ViewChild(MatTabGroup) infoTabs?: MatTabGroup;

    private resize = debounce(() => this.config.config({width: innerWidth, height: innerHeight}), 500).bind(this);

    constructor(
        private config: AppConfigService,
        private status: AppStatusService,
        private console: CadConsoleService,
        private dataService: CadDataService,
        private route: ActivatedRoute
    ) {
        super();
    }

    async ngOnInit() {
        const cad = this.status.cad;
        Reflect.defineProperty(window, "cad", {value: cad});
        Reflect.defineProperty(window, "config", {value: this.config.config.bind(this.config)});
        Reflect.defineProperty(window, "status", {value: this.status});
        Reflect.defineProperty(window, "data0", {get: () => cad.data.components.data[0]});
        Reflect.defineProperty(window, "data0Ex", {get: () => cad.data.components.data[0].export()});
        Reflect.defineProperty(window, "selected", {get: () => cad.selected()});
        Reflect.defineProperty(window, "selectedArray", {get: () => cad.selected().toArray()});
        Reflect.defineProperty(window, "selected0", {get: () => cad.selected().toArray()[0]});
        this.status.openCad$.subscribe(() => {
            document.title = cad.data.components.data.map((v) => v.name).join(",");
        });

        let cachedData: any = null;
        let params: any = null;
        try {
            cachedData = JSON.parse(sessionStorage.getItem("cache-cad-data") || "null");
            params = JSON.parse(sessionStorage.getItem("params") || "{}");
        } catch (error) {
            console.warn(error);
        }
        if (cachedData) {
            if (!Array.isArray(cachedData)) {
                cachedData = [cachedData];
            }
            const data: CadData[] = cachedData.map((v: any) => new CadData(v));
            this.status.openCad(data, params.collection ?? "cad");
        } else {
            const {id, ids, collection} = this.route.snapshot.queryParams;
            const params: Partial<GetCadParams> = {};
            if ((id || ids) && collection) {
                this.config.config("collection", collection);
                if (id) {
                    params.id = id;
                }
                if (ids) {
                    params.ids = ids.split(",");
                }
                params.collection = collection;
            } else {
                const {cadIds, collection} = this.config.config();
                params.ids = cadIds;
                params.collection = collection;
            }
            const result = await this.dataService.getCad(params);
            this.status.openCad(result.cads);
        }
    }

    ngAfterViewInit() {
        if (this.cadContainer) {
            this.status.cad.appendTo(this.cadContainer.nativeElement);
        }
        this.config.config({padding: this.menuPadding.map((v) => v + 30)});
        this.subscribe(this.console.command, (cmd) => this.consoleComponent?.execute(cmd));
        this.subscribe(this.status.cadStatus$, ({name}) => {
            if (name === "assemble") {
                this.shownMenus = ["cadAssemble"];
            } else {
                this.shownMenus = ["cadInfo", "entityInfo"];
            }
        });

        if (this.infoTabs) {
            this.infoTabs.selectedIndex = this.config.config("infoTabIndex");
        }

        window.addEventListener("resize", this.resize);
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        window.removeEventListener("resize", this.resize);
    }

    private _setCadPadding(show: boolean, i: number) {
        const padding = this.config.config("padding");
        if (show) {
            padding[i] += this.menuPadding[i];
        } else {
            padding[i] -= this.menuPadding[i];
        }
        this.config.config({padding});
    }

    toggleTopMenu(show?: boolean) {
        this.showTopMenu = show ?? !this.showTopMenu;
        this._setCadPadding(this.showTopMenu, 0);
    }

    toggleRightMenu(show?: boolean) {
        this.showRightMenu = show ?? !this.showRightMenu;
        this._setCadPadding(this.showRightMenu, 1);
    }

    toggleBottomMenu(show?: boolean) {
        this.showBottomMenu = show ?? !this.showBottomMenu;
        this._setCadPadding(this.showBottomMenu, 2);
    }

    toggleLeftMenu(show?: boolean) {
        this.showLeftMenu = show ?? !this.showLeftMenu;
        this._setCadPadding(this.showLeftMenu, 3);
    }

    toggleAllMenu(show?: boolean) {
        this.showAllMenu = show ?? !this.showAllMenu;
        this.toggleTopMenu(this.showAllMenu);
        this.toggleRightMenu(this.showAllMenu);
        this.toggleBottomMenu(this.showAllMenu);
        this.toggleLeftMenu(this.showAllMenu);
    }

    save() {
        this.console.execute("save");
    }

    refresh() {
        this.status.openCad();
    }

    zoomAll() {
        this.status.cad.center();
    }

    onInfoTabChange({index}: MatTabChangeEvent) {
        this.tabIndex = index;
        this.config.config("infoTabIndex", index);
    }

    toggleMultiSelect() {
        let selectMode = this.config.config("selectMode");
        selectMode = selectMode === "multiple" ? "single" : "multiple";
        this.config.config("selectMode", selectMode);
    }
}
