import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from "@angular/core";
import {MatCheckboxChange} from "@angular/material/checkbox";
import {MatDialog} from "@angular/material/dialog";
import {MatMenuTrigger} from "@angular/material/menu";
import {DomSanitizer} from "@angular/platform-browser";
import {imgLoading, timer} from "@app/app.common";
import {getCadPreview, setCadData} from "@app/cad.utils";
import {CadData, CadEntities, CadEventCallBack} from "@cad-viewer";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {ContextMenu} from "@mixins/context-menu.mixin";
import {Subscribed} from "@mixins/subscribed.mixin";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {AppConfigService} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import {downloadByString, Matrix, ObjectOf, Point} from "@utils";
import {isEqual} from "lodash";

interface CadNode {
  data: CadData;
  img: string;
  checked: boolean;
}

type ContextMenuCadField = "main" | "component";

@Component({
  selector: "app-sub-cads",
  templateUrl: "./sub-cads.component.html",
  styleUrls: ["./sub-cads.component.scss"]
})
export class SubCadsComponent extends ContextMenu(Subscribed()) implements OnInit, OnDestroy {
  main: CadNode | null = null;
  components: CadNode[] = [];
  checkedIndex = -1;
  needsReload: string | null = null;
  componentsExpanded = true;
  @ViewChild(MatMenuTrigger) contextMenu!: MatMenuTrigger;
  @ViewChild("dxfInut", {read: ElementRef}) dxfInut!: ElementRef<HTMLElement>;
  contextMenuCad?: {field: ContextMenuCadField; data: CadData};
  private lastPointer: Point | null = null;
  private entitiesToMove?: CadEntities;
  private entitiesNotToMove?: CadEntities;
  private entitiesNeedRender = false;

  get componentsSelectable() {
    return this.status.components.selectable$.value;
  }
  set componentsSelectable(value) {
    this.status.components.selectable$.next(value);
  }
  get componentsMode() {
    return this.status.components.mode$.value;
  }
  set componentsMode(value) {
    this.status.components.mode$.next(value);
  }

  constructor(
    private sanitizer: DomSanitizer,
    private config: AppConfigService,
    private status: AppStatusService,
    private dialog: MatDialog,
    private message: MessageService,
    private dataService: CadDataService
  ) {
    super();
  }

  ngOnInit() {
    this.updateData();
    this.subscribe(this.status.openCad$, () => this.updateData());
    this.subscribe(this.status.components.selected$, () => this.setSelectedComponents());

    const setConfig = () => {
      const {subCadsMultiSelect} = this.config.getConfig();
      this.multiSelect = subCadsMultiSelect;
    };
    setConfig();
    const sub = this.config.configChange$.subscribe(({isUserConfig}) => {
      if (isUserConfig) {
        setConfig();
        sub.unsubscribe();
      }
    });

    const cad = this.status.cad;
    cad.on("pointerdown", this._onPointerDown);
    cad.on("pointermove", this._onPointerMove);
    cad.on("pointerup", this.onPointerUp);
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    const cad = this.status.cad;
    cad.off("pointerdown", this._onPointerDown);
    cad.off("pointermove", this._onPointerMove);
    cad.off("pointerup", this.onPointerUp);
  }

  private _onPointerDown: CadEventCallBack<"pointerdown"> = (event) => {
    const {clientX, clientY, shiftKey, button} = event;
    if (this.config.getConfig("dragAxis") !== "" || (button !== 1 && !(shiftKey && button === 0))) {
      return;
    }
    this.lastPointer = new Point(clientX, clientY);
    this.entitiesToMove = new CadEntities();
    this.entitiesNotToMove = new CadEntities();
    const components = this.status.components.selected$.value;
    components.forEach((v) => this.entitiesToMove?.merge(v.getAllEntities()));
    const ids: string[] = [];
    this.entitiesToMove.forEach((e) => ids.push(e.id));
    this.status.cad.data.getAllEntities().forEach((e) => {
      if (!ids.includes(e.id)) {
        this.entitiesNotToMove?.add(e);
      }
    });
  };

  private _onPointerMove: CadEventCallBack<"pointermove"> = (event) => {
    if (!this.lastPointer) {
      return;
    }
    const {clientX, clientY} = event;
    const cad = this.status.cad;
    const components = this.status.components.selected$.value;
    const pointer = new Point(clientX, clientY);
    const translate = this.lastPointer.sub(pointer).divide(cad.zoom());
    translate.x = -translate.x;
    if (components.length) {
      components.forEach((v) => cad.data.moveComponent(v, translate, false));
      this.entitiesNeedRender = true;
    } else if (this.entitiesToMove && this.entitiesNotToMove) {
      cad.moveEntities(this.entitiesToMove, this.entitiesNotToMove, translate.x, translate.y);
      this.entitiesNeedRender = true;
    }
    this.lastPointer.copy(pointer);
  };

  private onPointerUp: CadEventCallBack<"pointerup"> = () => {
    if (this.lastPointer) {
      this.lastPointer = null;
      if (this.entitiesNeedRender) {
        this.status.cad.render();
      }
    }
  };

  private _getCadNode(data: CadData) {
    const node: CadNode = {data, img: imgLoading, checked: false};
    const collection = this.status.collection$.value;
    setTimeout(async () => {
      const img = await getCadPreview(collection, node.data, {http: this.dataService});
      node.img = this.sanitizer.bypassSecurityTrustUrl(img) as string;
    }, 0);
    return node;
  }

  toggleMultiSelect() {
    this.componentsSelectable = !this.componentsSelectable;
    if (!this.componentsSelectable) {
      const selectedComponents = this.status.components.selected$.value;
      if (selectedComponents.length > 1) {
        this.status.components.selected$.next([selectedComponents[0]]);
      }
    }
  }

  isAllComponentsSelected() {
    const ids1 = this.status.components.selected$.value.map((v) => v.id);
    const ids2 = this.status.cad.data.components.data.map((v) => v.id);
    return isEqual(ids1, ids2);
  }

  selectAllComponents() {
    this.status.components.selected$.next(this.status.cad.data.components.data);
  }

  unselectAllComponents() {
    this.status.components.selected$.next([]);
  }

  selectComponent(index: number, event?: MatCheckboxChange | boolean | null) {
    if (!this.componentsSelectable) {
      return;
    }
    const node = this.components[index];
    const selectedComponents: CadData[] = this.status.components.selected$.value;
    if (node.checked) {
      this.status.components.selected$.next(selectedComponents.filter((v) => v.id !== node.data.id));
    } else {
      if (this.multiSelect) {
        this.status.components.selected$.next([...selectedComponents, node.data]);
      } else {
        this.status.components.selected$.next([node.data]);
      }
    }
  }

  setSelectedComponents() {
    const selectedComponents = this.status.components.selected$.value;
    for (const node of this.components) {
      node.checked = selectedComponents.some((v) => v.id === node.data.id);
    }
    const cad = this.status.cad;
    if (selectedComponents.length < 1) {
      this.status.focus();
      this.config.setConfig("dragAxis", "xy");
    } else {
      this.status.blur();
      this.config.setConfig("dragAxis", "");
      this.components.forEach((v) => {
        if (selectedComponents.some((vv) => vv.id === v.data.id)) {
          this.status.focus(v.data.getAllEntities());
        }
      });
    }
    cad.render();
  }

  updateData() {
    const cad = this.status.cad;
    const components = cad.data.components.data;
    this.main = this._getCadNode(cad.data);
    this.components = [];
    for (const v of components) {
      this.components.push(this._getCadNode(v));
    }
    this.componentsExpanded = this.components.length > 0;
    this.status.components.selected$.next([]);
  }

  onContextMenu(event: MouseEvent, data: CadData, field: ContextMenuCadField) {
    super.onContextMenu(event);
    if (!this.componentsSelectable) {
      return;
    }
    this.contextMenuCad = {field, data};
  }

  async editComponents() {
    if (!this.contextMenuCad) {
      return;
    }
    const data = this.contextMenuCad.data;
    const checkedItems = data.components.data.map((v) => v.id);
    const qiliao = this.status.collection$.value === "qiliaozuhe";
    const feilei = [
      "铰框",
      "锁框",
      "顶框",
      "边铰料",
      "边锁料",
      "中铰料",
      "中锁料",
      "小铰料",
      "小锁料",
      "锁企料",
      "扇锁企料",
      "示意图",
      "装配示意图",
      "包边正面"
    ];
    const sourceResponse = await this.dataService.post<any[]>("ngcad/getMenshanbujuCads", {xinghao: data.options.型号});
    let source: CadData[] | undefined;
    if (sourceResponse?.data) {
      source = sourceResponse.data.map((v) => new CadData(v));
    }
    const cads = await openCadListDialog(this.dialog, {
      data: {
        selectMode: "multiple",
        checkedItems,
        options: data.options,
        collection: "cad",
        qiliao,
        search: {
          _id: {$ne: data.id},
          分类: {$not: {$in: feilei}}
        },
        source
      }
    });
    const shouldReplace = (cad1: CadData, cad2: CadData) => cad1.id === cad2.id;
    if (Array.isArray(cads)) {
      const components = data.components.data;
      const timerName = "sub-cads-editChildren";
      timer.start(timerName);
      const positions: ObjectOf<number[]> = {};
      const rect1 = data.entities.getBoundingRect();
      for (const cad of cads) {
        const length = components.length;
        let shouldPush = true;
        for (let i = 0; i < length; i++) {
          if (shouldReplace(components[i], cad)) {
            const {x, y} = components[i].getBoundingRect();
            positions[components[i].id] = [x, y];
            components[i] = cad;
            shouldPush = false;
            break;
          }
        }
        if (shouldPush) {
          setCadData(cad, this.status.project);
          const rect2 = cad.getBoundingRect();
          const translate = new Point(rect1.x - rect2.x, rect1.y - rect2.y);
          const matrix = new Matrix();
          if (Math.abs(translate.x) > 1500 || Math.abs(translate.y) > 1500) {
            translate.x += (rect1.width + rect2.width) / 2 + 15;
            matrix.transform({translate});
          }
          cad.transform(matrix, true);
          components.push(cad);
        }
      }
      let timerContent = "";
      data.updateComponents();
      components.forEach((v) => {
        if (v.id in positions) {
          const {x: x1, y: y1} = v.getBoundingRect();
          const [x2, y2] = positions[v.id];
          v.transform({translate: [x2 - x1, y2 - y1]}, true);
        }
      });
      timerContent = "编辑装配CAD";
      await this.status.openCad();
      timer.end(timerName, timerContent);
    }
  }

  downloadDxf() {
    if (!this.contextMenuCad) {
      return;
    }
    const data = this.status.closeCad(this.contextMenuCad.data);
    this.dataService.downloadDxf(data);
  }

  uploadDxf(append: boolean, mainCad: boolean) {
    const el = this.dxfInut.nativeElement;
    el.click();
    if (mainCad) {
      el.setAttribute("main-cad", "");
    } else {
      el.removeAttribute("main-cad");
    }
    if (append) {
      el.setAttribute("append", "");
    } else {
      el.removeAttribute("append");
    }
  }

  async onDxfInutChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!this.contextMenuCad || !file) {
      return;
    }
    const append = input.hasAttribute("append");
    const mainCad = input.hasAttribute("main-cad");
    const data = this.contextMenuCad.data;
    console.log(append, mainCad);
    if (append) {
      const resData = await this.dataService.uploadDxf(file);
      if (resData) {
        const rect1 = data.getBoundingRect();
        const rect2 = resData.entities.getBoundingRect();
        if (rect1.isFinite && rect2.isFinite) {
          const dx = rect1.right + 10 - rect2.left;
          const dy = rect1.y - rect2.y;
          resData.entities.transform({translate: [dx, dy]}, true);
        }
        data.entities.merge(resData.entities);
        data.blocks = resData.blocks;
        await this.status.openCad();
      }
    } else {
      const content = `确定要上传<span style="color:red">${file.name}</span>并替换<span style="color:red">${data.name}</span>的数据吗？`;
      const yes = await this.message.confirm(content);
      if (yes) {
        const resData = await this.dataService.uploadDxf(file);
        if (resData) {
          if (mainCad) {
            const data1 = new CadData();
            data1.entities = data.entities;
            const data2 = new CadData();
            data2.entities = resData.entities;
            const rect1 = data1.getBoundingRect();
            const rect2 = data2.getBoundingRect();
            if (rect1.isFinite && rect2.isFinite) {
              data2.transform({translate: rect1.min.clone().sub(rect2.min)}, true);
            }
            data.entities = data2.entities;
          } else {
            data.entities = resData.entities;
            // data.partners = resData.partners;
            // data.components = resData.components;
            data.zhidingweizhipaokeng = resData.zhidingweizhipaokeng;
            data.info = resData.info;
          }
          data.blocks = resData.blocks;
          data.layers = resData.layers;
          await this.status.openCad();
        }
      }
    }
    input.value = "";
  }

  async getJson() {
    if (!this.contextMenuCad) {
      return;
    }
    const data = this.status.closeCad(this.contextMenuCad.data);
    await navigator.clipboard.writeText(JSON.stringify(data.export()));
    this.message.snack("内容已复制");
  }

  async setJson() {
    if (!this.contextMenuCad) {
      return;
    }
    const data = this.contextMenuCad.data;
    const json = await navigator.clipboard.readText();
    if (!json) {
      this.message.alert("内容为空");
      return;
    }
    let obj: any;
    try {
      obj = JSON.parse(json);
    } catch (e) {
      this.message.alert("内容不是有效的JSON");
    }
    obj.id = data.id;
    data.init(obj);
    this.status.openCad();
  }

  async downloadJson() {
    if (!this.contextMenuCad) {
      return;
    }
    const data = this.status.closeCad(this.contextMenuCad.data);
    downloadByString(JSON.stringify(data.export()), {filename: `${data.name}.json`});
  }

  async editJson() {
    if (!this.contextMenuCad) {
      return;
    }
    const data = this.status.closeCad(this.contextMenuCad.data);
    const result = await this.message.json(this.dialog, data.export());
    if (result) {
      result.id = this.contextMenuCad.data.id;
      this.contextMenuCad.data.init(result);
      this.status.openCad();
    }
  }

  async deleteSelectedComponents() {
    const data = this.status.cad.data;
    const ids = this.status.components.selected$.value.map((v) => v.id);
    data.components.data = data.components.data.filter((v) => !ids.includes(v.id));
    this.status.openCad();
  }

  async replaceData() {
    if (!this.contextMenuCad) {
      return;
    }
    const data = this.contextMenuCad.data;
    const cads = await openCadListDialog(this.dialog, {data: {selectMode: "single", options: data.options, collection: "cad"}});
    if (cads && cads[0]) {
      this.dataService.replaceData(data, cads[0].id, this.status.collection$.value);
    }
  }
}
