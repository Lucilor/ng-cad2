import {trigger, state, style, transition, animate} from "@angular/animations";
import {CdkDragEnd, CdkDragMove, CdkDragStart} from "@angular/cdk/drag-drop";
import {Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef} from "@angular/core";
import {MatMenuTrigger} from "@angular/material/menu";
import {MatTabGroup, MatTabChangeEvent} from "@angular/material/tabs";
import {ActivatedRoute} from "@angular/router";
import {CadEventCallBack, CadData} from "@src/app/cad-viewer";
import {CadInfoComponent} from "@src/app/components/menu/cad-info/cad-info.component";
import {ContextMenu} from "@src/app/mixins/context-menu.mixin";
import {Subscribed} from "@src/app/mixins/subscribed.mixin";
import {CadConsoleComponent} from "@src/app/modules/cad-console/components/cad-console/cad-console.component";
import {CadConsoleService} from "@src/app/modules/cad-console/services/cad-console.service";
import {CadDataService, GetCadParams} from "@src/app/modules/http/services/cad-data.service";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {AppConfig, AppConfigService} from "@src/app/services/app-config.service";
import {AppStatusService} from "@src/app/services/app-status.service";
import {CadStatusAssemble} from "@src/app/services/cad-status";
import {debounce} from "lodash";
import {BehaviorSubject} from "rxjs";

interface DragData {
    width: number;
}

type Dragkey = keyof Pick<AppConfig, "leftMenuWidth" | "rightMenuWidth">;

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
        ]),
        trigger("menuWidth", [
            transition(":enter", [style({opacity: 0}), animate("0.5s", style({opacity: 1}))]),
            transition(":leave", [style({opacity: 1}), animate("0.5s", style({opacity: 0}))])
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
    cadLength = "0.00";
    leftMenuWidth$ = new BehaviorSubject<number>(this.config.getConfig("leftMenuWidth"));
    rightMenuWidth$ = new BehaviorSubject<number>(this.config.getConfig("rightMenuWidth"));
    dragDataLeft: DragData = {width: 0};
    dragDataRight: DragData = {width: 0};
    isDraggingLeft = false;
    isDraggingRight = false;

    get multiSelect() {
        return this.status.cad.config("selectMode") === "multiple";
    }
    get entityDraggable() {
        return this.status.cad.config("entityDraggable");
    }
    get cadStatusStr() {
        return this.status.cadStatus.name;
    }

    @ViewChild("cadContainer", {read: ElementRef}) cadContainer?: ElementRef<HTMLElement>;
    @ViewChild(CadConsoleComponent) consoleComponent?: CadConsoleComponent;
    @ViewChild(CadInfoComponent) infoComponent?: CadInfoComponent;
    @ViewChild(MatMenuTrigger) contextMenu?: MatMenuTrigger;
    @ViewChild(MatTabGroup) infoTabs?: MatTabGroup;

    private _resize = debounce(() => this.config.setConfig({width: innerWidth, height: innerHeight}), 500).bind(this);
    private _onEntitiesCopy: CadEventCallBack<"entitiescopy"> = (entities) => {
        const cad = this.status.cad;
        const selectedCads = this.status.getFlatSelectedCads();
        if (selectedCads.length !== 1) {
            this.message.alert("请先选择且仅选择一个CAD");
            cad.entitiesCopied = undefined;
            return;
        }
        entities.forEach((e) => (e.opacity = 0.3));
        selectedCads[0].entities.merge(entities);
        cad.unselectAll();
        cad.render(entities);
    };
    private _onEntitiesPaste: CadEventCallBack<"entitiespaste"> = (entities) => {
        entities.forEach((e) => (e.opacity = 1));
        this.status.cad.render(entities);
    };

    constructor(
        private config: AppConfigService,
        private status: AppStatusService,
        private console: CadConsoleService,
        private dataService: CadDataService,
        private route: ActivatedRoute,
        private message: MessageService,
        private cd: ChangeDetectorRef
    ) {
        super();
    }

    async ngOnInit() {
        const cad = this.status.cad;
        Reflect.defineProperty(window, "cad", {value: cad});
        Reflect.defineProperty(window, "getConfig", {value: this.config.getConfig.bind(this.config)});
        Reflect.defineProperty(window, "setConfig", {value: this.config.setConfig.bind(this.config)});
        Reflect.defineProperty(window, "status", {value: this.status});
        Reflect.defineProperty(window, "data0", {get: () => cad.data.components.data[0]});
        Reflect.defineProperty(window, "data0Ex", {get: () => cad.data.components.data[0].export()});
        Reflect.defineProperty(window, "selected", {get: () => cad.selected()});
        Reflect.defineProperty(window, "selectedArray", {get: () => cad.selected().toArray()});
        Reflect.defineProperty(window, "selected0", {get: () => cad.selected().toArray()[0]});
        this.status.openCad$.subscribe(() => {
            document.title = cad.data.components.data.map((v) => v.name || "(未命名)").join(",") || "未选择CAD";
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
            const {id, ids, collection, project} = this.route.snapshot.queryParams;
            const getParams: Partial<GetCadParams> = {};
            if ((id || ids) && collection) {
                this.status.collection$.next(collection);
                if (id) {
                    getParams.id = id;
                }
                if (ids) {
                    getParams.ids = ids.split(",");
                }
                getParams.collection = collection;
            }
            if (project) {
                this.dataService.baseURL = this.dataService.baseURL.replace(/\/n\/(^\/)*\//, `/n/${project}/`);
            }
            const result = await this.dataService.getCad(getParams);
            this.status.openCad(result.cads);
        }
        cad.on("entitiescopy", this._onEntitiesCopy);
        cad.on("entitiespaste", this._onEntitiesPaste);

        this.subscribe(this.config.configChange$, ({newVal}) => {
            const {leftMenuWidth, rightMenuWidth} = newVal;
            if (typeof leftMenuWidth === "number") {
                this.leftMenuWidth$.next(leftMenuWidth);
            }
            if (typeof rightMenuWidth === "number") {
                this.rightMenuWidth$.next(rightMenuWidth);
            }
        });
    }

    ngAfterViewInit() {
        if (this.cadContainer) {
            this.status.cad.appendTo(this.cadContainer.nativeElement);
        }
        this.config.setConfig({padding: this.menuPadding.map((v) => v + 30)});
        this.subscribe(this.console.command, (cmd) => this.consoleComponent?.execute(cmd));
        this.subscribe(this.status.cadStatusEnter$, (cadStatus) => {
            if (cadStatus instanceof CadStatusAssemble) {
                this.shownMenus = ["cadAssemble"];
            } else {
                this.shownMenus = ["cadInfo", "entityInfo"];
            }
        });

        const infoTabs = this.infoTabs;
        if (infoTabs) {
            const sub = this.config.configChange$.subscribe(({newVal}) => {
                const infoTabIndex = newVal.infoTabIndex;
                if (typeof infoTabIndex === "number" && infoTabIndex >= 0 && this.infoTabs) {
                    this.infoTabs.selectedIndex = infoTabIndex;
                    sub.unsubscribe();
                }
            });
        }

        window.addEventListener("resize", this._resize);
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        const cad = this.status.cad;
        window.removeEventListener("resize", this._resize);
        cad.off("entitiescopy", this._onEntitiesCopy);
        cad.off("entitiespaste", this._onEntitiesPaste);
    }

    private _setCadPadding(show: boolean, i: number) {
        const padding = this.config.getConfig("padding");
        if (show) {
            padding[i] += this.menuPadding[i];
        } else {
            padding[i] -= this.menuPadding[i];
        }
        this.config.setConfig({padding});
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
        this.config.setConfig("infoTabIndex", index);
    }

    toggleMultiSelect() {
        let selectMode = this.config.getConfig("selectMode");
        selectMode = selectMode === "multiple" ? "single" : "multiple";
        this.config.setConfig("selectMode", selectMode);
    }

    toggleEntityDraggable() {
        this.config.setConfig("entityDraggable", !this.config.getConfig("entityDraggable"));
    }

    onCadLengthsChange(event: string[]) {
        this.cadLength = event[0];
        this.cd.detectChanges();
    }

    onResizeMenuStart(_event: CdkDragStart<DragData>, key: Dragkey) {
        if (key === "leftMenuWidth") {
            this.dragDataLeft.width = this.leftMenuWidth$.value;
            this.isDraggingLeft = true;
        } else if (key === "rightMenuWidth") {
            this.dragDataRight.width = this.rightMenuWidth$.value;
            this.isDraggingRight = true;
        }
    }

    onResizeMenu(event: CdkDragMove<DragData>, key: Dragkey) {
        if (key === "leftMenuWidth") {
            this.leftMenuWidth$.next(event.source.data.width + event.distance.x);
        } else if (key === "rightMenuWidth") {
            this.rightMenuWidth$.next(event.source.data.width - event.distance.x);
        }
        event.source.element.nativeElement.style.transform = "";
    }

    onResizeMenuEnd(_event: CdkDragEnd<DragData>, key: Dragkey) {
        if (key === "leftMenuWidth") {
            this.config.setConfig(key, this.leftMenuWidth$.value);
            this.isDraggingLeft = false;
        } else if (key === "rightMenuWidth") {
            this.config.setConfig(key, this.rightMenuWidth$.value);
            this.isDraggingRight = false;
        }
    }
}
