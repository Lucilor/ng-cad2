import {Component} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {CadData, CadLine, CadMtext, CadZhankai} from "@cad-viewer";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {ObjectOf} from "@utils";

type ExportType = "包边正面" | "框型和企料" | "指定型号" | "自由选择";

@Component({
    selector: "app-export",
    templateUrl: "./export.component.html",
    styleUrls: ["./export.component.scss"]
})
export class ExportComponent {
    constructor(private dialog: MatDialog, private dataService: CadDataService) {}

    private async _queryIds(where: ObjectOf<any>) {
        return (await this.dataService.queryMongodb<{_id: string}>({collection: "cad", fields: ["_id"], where})).map((v) => v._id);
    }

    async exportCads(type: ExportType) {
        let ids: string[];
        switch (type) {
            case "包边正面":
                ids = await this._queryIds({分类: "包边正面"});
                break;
            case "框型和企料":
                ids = await this._queryIds({分类: {$regex: "^锁框|铰框|顶框|锁企料|铰企料$"}});
                break;
            case "指定型号":
                ids = await this._queryIds({分类: "算料", "选项.型号": {$regex: "^.+$"}});
                break;
            case "自由选择":
                ids = (
                    (await openCadListDialog(this.dialog, {
                        data: {selectMode: "multiple", collection: "cad", search: {分类: "^.+$"}}
                    })) ?? []
                ).map((v) => v.id);
                break;
            default:
                return;
        }
        console.log(ids);
        if (ids.length > 0) {
            const data = await this._joinCad(ids);
            console.log(data);
            this.dataService.downloadDxf(data);
            // downloadByString(JSON.stringify(data.export()), "data.json");
        }
    }

    private async _joinCad(ids: string[]) {
        const result = new CadData();
        for (const id of ids) {
            const data = await this.dataService.queryMongodb({collection: "cad", where: {_id: id}});
            if (data.length !== 1) {
                continue;
            }
            const cad = new CadData(data[0].json);
            const rect = cad.getBoundingRect();

            let text = [
                `唯一码: ${cad.info.唯一码 ?? (await this.getUniqCode(cad))}`,
                `名字: ${cad.name}`,
                `分类: ${cad.type}`,
                `分类2: ${cad.type2}`,
                `条件: ${cad.conditions.join(",")}`
            ].join("\n");
            for (const optionName in cad.options) {
                text += `\n${optionName}: ${cad.options[optionName]}`;
            }
            const zhankai = cad.zhankai[0] ?? new CadZhankai();
            text += `\n展开高: ${zhankai.zhankaigao}`;
            text += `\n展开宽: ${zhankai.zhankaikuan}`;
            if (cad.info.修改包边正面宽规则) {
                text += `\n\n修改包边正面宽规则: \n${cad.info.修改包边正面宽规则}`;
            }
            if (cad.info.锁边自动绑定可搭配铰边) {
                text += `\n\n锁边自动绑定可搭配铰边: \n${cad.info.锁边自动绑定可搭配铰边}`;
            }
            cad.entities.add(new CadMtext({text, insert: [rect.left, rect.bottom - 100], anchor: [0, 0]}));
            const textHeight = 1000;

            cad.getAllEntities().line.forEach((e) => (e.info.generateLineInfo = true));

            const padding = [100, 500, 500, 100];
            const min = rect.min.clone().sub(padding[3], padding[2]);
            const max = rect.max.clone().add(padding[1], padding[0]);
            min.y -= textHeight;
            [
                [min.x, min.y, max.x, min.y],
                [max.x, min.y, max.x, max.y],
                [max.x, max.y, min.x, max.y],
                [min.x, max.y, min.x, min.y]
            ].forEach((v) => {
                cad.entities.add(new CadLine({color: 3, start: [v[0], v[1]], end: [v[2], v[3]]}));
            });

            result.entities.merge(cad.getAllEntities());
        }
        return result;
    }

    private async getUniqCode({type, name}: CadData) {
        const response = await this.dataService.post<string>("peijian/cad/getUniqCode", {type, name});
        if (response?.data) {
            return response.data;
        }
        return type + name + new Date().toString();
    }
}
