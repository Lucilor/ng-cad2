import {animate, state, style, transition, trigger} from "@angular/animations";
import {CdkDragEnd, CdkDragMove, CdkDragStart} from "@angular/cdk/drag-drop";
import {AfterViewInit, Component, ElementRef, HostListener, Input, OnDestroy, QueryList, ViewChild, ViewChildren} from "@angular/core";
import {MatMenuTrigger} from "@angular/material/menu";
import {MatTabChangeEvent, MatTabGroup} from "@angular/material/tabs";
import {setGlobal} from "@app/app.common";
import {Debounce} from "@decorators/debounce";
import {CadEventCallBack} from "@lucilor/cad-viewer";
import {ContextMenu} from "@mixins/context-menu.mixin";
import {Subscribed} from "@mixins/subscribed.mixin";
import {CadConsoleComponent} from "@modules/cad-console/components/cad-console/cad-console.component";
import {CadConsoleService} from "@modules/cad-console/services/cad-console.service";
import {AppConfig, AppConfigService} from "@services/app-config.service";
import {AppStatusService, OpenCadOptions} from "@services/app-status.service";
import {CadStatusAssemble, CadStatusSplit} from "@services/cad-status";
import {debounce} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {BehaviorSubject, map, startWith, take} from "rxjs";

@Component({
  selector: "app-cad-editor",
  templateUrl: "./cad-editor.component.html",
  styleUrls: ["./cad-editor.component.scss"],
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
export class CadEditorComponent extends ContextMenu(Subscribed()) implements AfterViewInit, OnDestroy {
  private _params?: OpenCadOptions;
  @Input()
  get params() {
    return this._params;
  }
  set params(value) {
    this._params = value;
    this.refresh();
  }
  shownMenus: ("cadInfo" | "entityInfo" | "cadAssemble" | "cadSplit")[] = ["cadInfo", "entityInfo"];
  showTopMenu = true;
  showRightMenu = true;
  showBottomMenu = true;
  showLeftMenu = true;
  showAllMenu = true;
  tabIndex = 0;
  cadLength$ = this.status.cadTotalLength$.pipe(
    startWith(0),
    map((v) => v.toFixed(2))
  );
  menuPaddingBase = [20, 20, 20, 20];
  leftMenuWidth$ = new BehaviorSubject<number>(this.config.getConfig("leftMenuWidth"));
  rightMenuWidth$ = new BehaviorSubject<number>(this.config.getConfig("rightMenuWidth"));
  topMenuHeight$ = new BehaviorSubject<number>(80);
  bottomMenuHeight$ = new BehaviorSubject<number>(20);
  dragDataLeft: DragData = {width: 0};
  dragDataRight: DragData = {width: 0};
  isDraggingLeft = false;
  isDraggingRight = false;
  spinnerId = "cadEditor";
  private _isViewInited = false;

  isCadLocal$ = this.status.openCad$.pipe<OpenCadOptions, boolean>(
    startWith({}),
    map((v) => !!v.isLocal)
  );

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
  @ViewChild(CadConsoleComponent) cadConsoleComponent!: CadConsoleComponent;
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

  constructor(private config: AppConfigService, private status: AppStatusService, private cadConsole: CadConsoleService) {
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

  ngAfterViewInit() {
    setGlobal("cadEditor", this);
    const cad = this.status.cad;
    cad.appendTo(this.cadContainer.nativeElement);
    cad.on("entitiescopy", this._onEntitiesCopy);
    cad.on("entitiespaste", this._onEntitiesPaste);
    this._setCadPadding();

    this.subscribe(this.config.configChange$, ({newVal}) => {
      const {leftMenuWidth, rightMenuWidth} = newVal;
      if (typeof leftMenuWidth === "number") {
        this.leftMenuWidth$.next(leftMenuWidth);
      }
      if (typeof rightMenuWidth === "number") {
        this.rightMenuWidth$.next(rightMenuWidth);
      }
    });
    this.subscribe(this.status.cadStatusEnter$, (cadStatus) => {
      if (cadStatus instanceof CadStatusAssemble) {
        this.shownMenus = ["cadAssemble"];
      } else if (cadStatus instanceof CadStatusSplit) {
        this.shownMenus = ["cadInfo", "entityInfo", "cadSplit"];
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
    infoTabs.animationDone.pipe(take(1)).subscribe(() => {
      setTimeout(() => {
        setInfoTabs();
      }, 0);
    });
    const sub = this.config.configChange$.subscribe(({isUserConfig}) => {
      if (isUserConfig) {
        setInfoTabs();
        sub.unsubscribe();
      }
    });

    this._scrollbars.forEach((scrollbar) => {
      this.subscribe(scrollbar.scrolled, this.onScrollChange);
    });

    this.cadConsole.command$.subscribe((command) => {
      this.cadConsoleComponent.execute(command);
    });
    setTimeout(() => {
      this._isViewInited = true;
      this.refresh();
    }, 0);
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    const cad = this.status.cad;
    cad.off("entitiescopy", this._onEntitiesCopy);
    cad.off("entitiespaste", this._onEntitiesPaste);
  }

  private _onEntitiesCopy: CadEventCallBack<"entitiescopy"> = (entities) => {
    const cad = this.status.cad;
    entities.forEach((e) => (e.opacity = 0.3));
    cad.data.entities.merge(entities);
    cad.unselectAll();
    cad.render(entities);
  };

  private _onEntitiesPaste: CadEventCallBack<"entitiespaste"> = (entities) => {
    entities.forEach((e) => (e.opacity = 1));
    this.status.cad.render(entities);
  };

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

  @HostListener("window:resize")
  @Debounce(500)
  resize() {
    const parentEl = this.cadContainer.nativeElement.parentElement;
    if (parentEl) {
      this.config.setConfig({width: parentEl.clientWidth, height: parentEl.clientHeight});
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

  async save() {
    await this.status.saveCad(this.spinnerId);
  }

  async refresh() {
    if (!this._isViewInited) {
      return;
    }
    await this.status.openCad(this._params);
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

interface DragData {
  width: number;
}

type Dragkey = keyof Pick<AppConfig, "leftMenuWidth" | "rightMenuWidth">;
