import {trigger, state, style, transition, animate} from "@angular/animations";
import {CdkDragEnd, CdkDragMove, CdkDragStart} from "@angular/cdk/drag-drop";
import {
    Component,
    OnInit,
    AfterViewInit,
    OnDestroy,
    ViewChild,
    ElementRef,
    ChangeDetectorRef,
    ViewChildren,
    QueryList
} from "@angular/core";
import {MatMenuTrigger} from "@angular/material/menu";
import {MatTabGroup, MatTabChangeEvent} from "@angular/material/tabs";
import {ActivatedRoute} from "@angular/router";
import {log} from "@app/app.log";
import {CadEventCallBack, CadData} from "@cad-viewer";
import {ContextMenu} from "@mixins/context-menu.mixin";
import {Subscribed} from "@mixins/subscribed.mixin";
import {CadConsoleComponent} from "@modules/cad-console/components/cad-console/cad-console.component";
import {CadConsoleService} from "@modules/cad-console/services/cad-console.service";
import {CadDataService, GetCadParams} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {AppConfig, AppConfigService} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import {CadStatusAssemble} from "@services/cad-status";
import {debounce} from "lodash";
import {PerfectScrollbarComponent} from "ngx-perfect-scrollbar";
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
    shownMenus: ("cadInfo" | "entityInfo" | "cadAssemble")[] = ["cadInfo", "entityInfo"];
    showTopMenu = true;
    showRightMenu = true;
    showBottomMenu = true;
    showLeftMenu = true;
    showAllMenu = true;
    loaderId = "saveCadLoader";
    tabIndex = 0;
    cadLength = "0.00";
    menuPaddingBase = [10, 10, 10, 10];
    leftMenuWidth$ = new BehaviorSubject<number>(this.config.getConfig("leftMenuWidth"));
    rightMenuWidth$ = new BehaviorSubject<number>(this.config.getConfig("rightMenuWidth"));
    topMenuHeight$ = new BehaviorSubject<number>(40);
    bottomMenuHeight$ = new BehaviorSubject<number>(20);
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

    @ViewChild(MatMenuTrigger) contextMenu!: MatMenuTrigger;
    @ViewChild("cadContainer", {read: ElementRef}) cadContainer!: ElementRef<HTMLElement>;
    @ViewChild(CadConsoleComponent) consoleComponent!: CadConsoleComponent;
    @ViewChild(MatTabGroup) infoTabs!: MatTabGroup;
    @ViewChildren(PerfectScrollbarComponent)
    private _scrollbars!: QueryList<PerfectScrollbarComponent>;
    private get _scrollbar() {
        const scrollbar = this._scrollbars.get(this.tabIndex);
        if (!scrollbar) {
            throw new Error("Failed to access scrollbar component.");
        }
        return scrollbar;
    }
    private _scrollChangeLock = false;

    constructor(
        private config: AppConfigService,
        private status: AppStatusService,
        private cadConsole: CadConsoleService,
        private dataService: CadDataService,
        private route: ActivatedRoute,
        private message: MessageService,
        private cd: ChangeDetectorRef
    ) {
        super();
    }

    onScrollChange = debounce((event: CustomEvent) => {
        if (this._scrollChangeLock) {
            this._scrollChangeLock = false;
            return;
        }
        const scroll = this.config.getConfig("scroll");
        const el = event.target as HTMLDivElement;
        scroll["tab" + this.tabIndex] = el.scrollTop;
        this.config.setConfig("scroll", scroll);
    }, 500);

    private _resize = debounce(() => this.config.setConfig({width: innerWidth, height: innerHeight}), 500);
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

    ngOnInit() {
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
        console.groupCollapsed("全局变量");
        log("cad -- 当前CAD实体");
        log("getConfig/setConfig -- 获取/设置当前配置");
        log("status -- 状态管理实体");
        log("data0 -- 第一个CAD数据");
        log("data0Ex -- 第一个CAD数据(的导出数据)");
        console.groupEnd();
        this.subscribe(this.status.openCad$, () => {
            document.title = cad.data.components.data.map((v) => v.name || "(未命名)").join(",") || "未选择CAD";
        });
        this._setCadPadding();
        this._initCad();
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
        this.status.cad.appendTo(this.cadContainer.nativeElement);
        this.subscribe(this.cadConsole.command, (cmd) => this.consoleComponent.execute(cmd));
        this.subscribe(this.status.cadStatusEnter$, (cadStatus) => {
            if (cadStatus instanceof CadStatusAssemble) {
                this.shownMenus = ["cadAssemble"];
            } else {
                this.shownMenus = ["cadInfo", "entityInfo"];
            }
        });

        const infoTabs = this.infoTabs;
        const setInfoTabs = () => {
            const {infoTabIndex, scroll} = this.config.getConfig();
            if (typeof infoTabIndex === "number" && infoTabIndex >= 0) {
                infoTabs.selectedIndex = infoTabIndex;
            }
            if (scroll) {
                this._setTabScroll();
            }
        };
        setInfoTabs();
        const sub = this.config.configChange$.subscribe(({isUserConfig}) => {
            if (isUserConfig) {
                setInfoTabs();
                sub.unsubscribe();
            }
        });

        window.addEventListener("resize", this._resize);
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        const cad = this.status.cad;
        window.removeEventListener("resize", this._resize);
        cad.off("entitiescopy", this._onEntitiesCopy);
        cad.off("entitiespaste", this._onEntitiesPaste);
    }

    private async _initCad() {
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
            const result = await this.dataService.getCad(getParams);
            this.status.openCad(result.cads);
        }
        const cad = this.status.cad;
        cad.on("entitiescopy", this._onEntitiesCopy);
        cad.on("entitiespaste", this._onEntitiesPaste);
    }

    private _setCadPadding() {
        const padding = this.menuPaddingBase.slice();
        if (this.showTopMenu) {
            padding[0] += this.topMenuHeight$.value;
        }
        if (this.showRightMenu) {
            padding[1] += this.rightMenuWidth$.value;
        }
        if (this.showBottomMenu) {
            padding[2] += this.bottomMenuHeight$.value;
        }
        if (this.showLeftMenu) {
            padding[3] += this.leftMenuWidth$.value;
        }
        this.config.setConfig({padding}, {sync: false});
    }

    private async _setTabScroll() {
        const scroll = this.config.getConfig("scroll");
        const key = "tab" + this.tabIndex;
        if (scroll[key] !== undefined) {
            this._scrollChangeLock = true;
            this._scrollbar.directiveRef?.scrollToTop(scroll[key]);
        }
    }

    toggleTopMenu(show?: boolean) {
        this.showTopMenu = show ?? !this.showTopMenu;
        this._setCadPadding();
    }

    toggleRightMenu(show?: boolean) {
        this.showRightMenu = show ?? !this.showRightMenu;
        this._setCadPadding();
    }

    toggleBottomMenu(show?: boolean) {
        this.showBottomMenu = show ?? !this.showBottomMenu;
        this._setCadPadding();
    }

    toggleLeftMenu(show?: boolean) {
        this.showLeftMenu = show ?? !this.showLeftMenu;
        this._setCadPadding();
    }

    toggleAllMenu(show?: boolean) {
        this.showAllMenu = show ?? !this.showAllMenu;
        this.toggleTopMenu(this.showAllMenu);
        this.toggleRightMenu(this.showAllMenu);
        this.toggleBottomMenu(this.showAllMenu);
        this.toggleLeftMenu(this.showAllMenu);
    }

    save() {
        this.cadConsole.execute("save");
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
        this._setTabScroll();
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
        this._setCadPadding();
    }
}
