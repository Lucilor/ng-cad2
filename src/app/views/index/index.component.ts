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
import {CadEventCallBack, CadData} from "@cad-viewer";
import {environment} from "@env";
import {ContextMenu} from "@mixins/context-menu.mixin";
import {Subscribed} from "@mixins/subscribed.mixin";
import {CadConsoleComponent} from "@modules/cad-console/components/cad-console/cad-console.component";
import {CadConsoleService} from "@modules/cad-console/services/cad-console.service";
import {CadDataService, GetCadParams} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {AppConfig, AppConfigService} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import {CadStatusAssemble} from "@services/cad-status";
import {log} from "@utils";
import {debounce} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
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
    menuPaddingBase = [20, 20, 20, 20];
    leftMenuWidth$ = new BehaviorSubject<number>(this.config.getConfig("leftMenuWidth"));
    rightMenuWidth$ = new BehaviorSubject<number>(this.config.getConfig("rightMenuWidth"));
    topMenuHeight$ = new BehaviorSubject<number>(80);
    bottomMenuHeight$ = new BehaviorSubject<number>(20);
    dragDataLeft: DragData = {width: 0};
    dragDataRight: DragData = {width: 0};
    isDraggingLeft = false;
    isDraggingRight = false;

    get multiSelect() {
        return this.status.cad.getConfig("selectMode") === "multiple";
    }
    get entityDraggable() {
        return this.status.cad.getConfig("entityDraggable");
    }
    get cadStatusStr() {
        return this.status.cadStatus.name;
    }

    @ViewChild(MatMenuTrigger) contextMenu!: MatMenuTrigger;
    @ViewChild("cadContainer", {read: ElementRef}) cadContainer!: ElementRef<HTMLElement>;
    @ViewChild(CadConsoleComponent) consoleComponent!: CadConsoleComponent;
    @ViewChild(MatTabGroup) infoTabs!: MatTabGroup;
    @ViewChildren(NgScrollbar)
    private _scrollbars!: QueryList<NgScrollbar>;
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

    onScrollChange = debounce(() => {
        if (this._scrollChangeLock) {
            return;
        }
        const scroll = this.config.getConfig("scroll");
        scroll["tab" + this.tabIndex] = this._scrollbar.viewport.nativeElement.scrollTop;
        this.config.setConfig("scroll", scroll);
    }, 1000);

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
        const globalVars: {name: string; desc: string; attrs: PropertyDescriptor}[] = [
            {name: "cad", desc: "当前CAD实例", attrs: {value: cad}},
            {name: "getConfig", desc: "获取当前配置", attrs: {value: this.config.getConfig.bind(this.config)}},
            {name: "setConfig", desc: "设置当前配置", attrs: {value: this.config.setConfig.bind(this.config)}},
            {name: "data0", desc: "第一个CAD数据", attrs: {get: () => cad.data.components.data[0]}},
            {name: "data0Ex", desc: "第一个CAD的导出数据", attrs: {get: () => cad.data.components.data[0].export()}},
            {name: "selected", desc: "当前选中的所有实体", attrs: {get: () => cad.selected()}},
            {name: "selected0", desc: "当前选中的第一个实体", attrs: {get: () => cad.selected().toArray()[0]}}
        ];
        if (!environment.production) {
            globalVars.push({name: "status", desc: "状态管理实例", attrs: {value: this.status}});
        }
        console.groupCollapsed("全局变量");
        const maxLen = globalVars.reduce((prev, curr) => Math.max(prev, curr.name.length), 0);
        globalVars.forEach((v) => {
            log(`${v.name.padEnd(maxLen, " ")} -- %c${v.desc}`, "", {fontStyle: "italic", paddingRight: "5px"});
            Reflect.defineProperty(window, v.name, v.attrs);
        });
        console.groupEnd();
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

        this._scrollbars.forEach((scrollbar) => {
            this.subscribe(scrollbar.scrolled, this.onScrollChange);
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
            const {id, ids, collection, errorMessage} = this.route.snapshot.queryParams;
            if (errorMessage) {
                this.message.alert(errorMessage);
            }
            if ((id || ids) && collection) {
                const getParams: GetCadParams = {collection, sync: true};
                this.status.collection$.next(collection);
                if (id) {
                    getParams.id = id;
                }
                if (ids) {
                    getParams.ids = ids.split(",");
                }
                getParams.collection = collection;
                const result = await this.dataService.getCad(getParams);
                this.status.openCad(result.cads);
            }
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
            this._scrollbar.scrollTo({top: scroll[key]});
            this._scrollChangeLock = false;
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
        this.cadConsole.execute("save", {loaderId: this.loaderId});
    }

    async refresh() {
        await this._initCad();
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
