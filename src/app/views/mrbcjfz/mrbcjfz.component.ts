import {Component, OnInit} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {CadData} from "@cad-viewer";
import {openBancaiFormDialog} from "@components/dialogs/bancai-form-dialog/bancai-form-dialog.component";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {BancaiList} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/types";
import {setGlobal} from "@src/app/app.common";
import {getCadPreview} from "@src/app/cad.utils";
import {getMrbcjfzInfo, MrbcjfzCadInfo, MrbcjfzHuajian, MrbcjfzInfo, MrbcjfzResponseData, MrbcjfzXinghaoInfo} from "./mrbcjfz.types";

@Component({
  selector: "app-mrbcjfz",
  templateUrl: "./mrbcjfz.component.html",
  styleUrls: ["./mrbcjfz.component.scss"]
})
export class MrbcjfzComponent implements OnInit {
  id = "";
  table = "";
  xinghao: MrbcjfzXinghaoInfo = new MrbcjfzXinghaoInfo({vid: 0, mingzi: ""});
  cads: MrbcjfzCadInfo[] = [];
  huajians: MrbcjfzHuajian[] = [];
  bancaiKeys: string[] = [];
  bancaiList: BancaiList[] = [];
  bancaiInputs: InputInfo<MrbcjfzInfo>[][] = [];
  activeBancaiKey: string | null = null;
  isCadsHidden = true;

  constructor(private route: ActivatedRoute, private dataService: CadDataService, private dialog: MatDialog) {
    setGlobal("mrbcjfz", this);
  }

  async ngOnInit() {
    const {id, table} = this.route.snapshot.queryParams;
    this.id = id || "";
    this.table = table || "";
    const response = await this.dataService.post<MrbcjfzResponseData>("peijian/xinghao/bancaifenzuIndex", {table, id});
    if (response?.data) {
      this.xinghao = new MrbcjfzXinghaoInfo(response.data.xinghao);
      this.cads = response.data.cads.map((v) => {
        const item: MrbcjfzCadInfo = {data: new CadData(v), img: "", hidden: false};
        (async () => {
          item.img = await getCadPreview("cad", item.data, {http: this.dataService});
        })();
        return item;
      });
      this.huajians = response.data.huajians;
      this.bancaiKeys = response.data.bancaiKeys;
      this.bancaiList = response.data.bancaiList;
      this.updateXinghao();
    }
  }

  updateXinghao() {
    const 默认板材 = this.xinghao.默认板材;
    this.xinghao.默认板材 = {};
    this.bancaiInputs = [];
    for (const key of this.bancaiKeys) {
      const data = getMrbcjfzInfo(默认板材[key]);
      this.xinghao.默认板材[key] = data;
    }
  }

  async editBancaiForm(key: string) {
    const info = this.xinghao.默认板材[key];
    const result = await openBancaiFormDialog(this.dialog, {
      data: {
        data: {
          bancai: info.选中板材,
          cailiao: info.选中材料,
          houdu: info.选中板材厚度,
          kexuanbancai: info.可选板材
        },
        bancaiList: this.bancaiList
      }
    });
    if (result) {
      info.选中板材 = result.bancai;
      info.选中材料 = result.cailiao;
      info.选中板材厚度 = result.houdu;
      info.可选板材 = result.kexuanbancai || [];
    }
  }

  getBancaiTitle(key: string) {
    const info = this.xinghao.默认板材[key];
    const arr = [info.选中板材, info.选中材料, info.选中板材厚度].filter(Boolean);
    if (arr.length < 3) {
      return "请选择";
    }
    return arr.join("/");
  }

  selectCads(key: string) {
    this.activeBancaiKey = key;
    this.isCadsHidden = false;
  }
}
