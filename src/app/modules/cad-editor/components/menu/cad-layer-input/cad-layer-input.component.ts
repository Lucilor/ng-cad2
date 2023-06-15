import {Component, Input} from "@angular/core";
import {MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";
import {CadEntity} from "@lucilor/cad-viewer";
import {Subscribed} from "@mixins/subscribed.mixin";
import {AppStatusService} from "@services/app-status.service";
import {BehaviorSubject} from "rxjs";

@Component({
  selector: "app-cad-layer-input[entities]",
  templateUrl: "./cad-layer-input.component.html",
  styleUrls: ["./cad-layer-input.component.scss"]
})
export class CadLayerInputComponent extends Subscribed() {
  @Input() entities: CadEntity[] = [];
  layerOptions$ = new BehaviorSubject<string[]>([]);
  get layerText() {
    const names = new Set(this.entities.map((e) => e.layer));
    if (names.size === 1) {
      return names.values().next().value;
    }
    return "";
  }

  constructor(public status: AppStatusService) {
    super();
    this.subscribe(status.openCad$, () => {
      const data = this.status.cad.data;
      const layerNames = new Set(["不显示", "跳过判断封闭图形", "微连"]);
      const layerNamesExclude = new Set(["Defpoints", "走线", "开料额外信息", "打孔", "展开长标注", "line-info", "导入错误信息"]);
      data.layers.forEach((layer) => {
        const name = layer.name;
        if (!layerNamesExclude.has(name)) {
          layerNames.add(name);
        }
      });
      data.entities.forEach((e) => {
        if (e.layer) {
          layerNames.add(e.layer);
        }
      }, true);
      this.layerOptions$.next([...layerNames]);
    });
  }

  onLayerTextChange(event: Event | MatAutocompleteSelectedEvent) {
    let value: string;
    if (event instanceof MatAutocompleteSelectedEvent) {
      value = event.option.value;
    } else {
      value = (event.target as HTMLInputElement).value;
    }
    this.entities.forEach((e) => (e.layer = value));
  }
}
