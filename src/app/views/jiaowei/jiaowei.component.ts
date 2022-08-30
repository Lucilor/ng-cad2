import {Component, OnInit} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {setGlobal} from "@app/app.common";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {ObjectOf} from "@utils";
import {Jiaowei, jiaoweiAnchorOptions} from "./jiaowei";

@Component({
    selector: "app-jiaowei",
    templateUrl: "./jiaowei.component.html",
    styleUrls: ["./jiaowei.component.scss"]
})
export class JiaoweiComponent implements OnInit {
    jiaowei = new Jiaowei();
    jiaoweiAnchorOptions = jiaoweiAnchorOptions;

    constructor(private dataService: CadDataService, private router: ActivatedRoute, private message: MessageService) {}

    async ngOnInit() {
        setGlobal("jiaowei", this);
        const {id, encode} = this.router.snapshot.queryParams;
        const response = await this.dataService.post<ObjectOf<any>[]>(
            "jichu/jichu/table_select/" + encode,
            {
                table: "p_menjiao",
                search: {vid: id},
                page: 1,
                limit: 1
            },
            {testData: "jiaowei"}
        );
        if (response?.data && response.data.length > 0) {
            try {
                this.jiaowei.import(JSON.parse(response.data[0].jiaowei));
            } catch (error) {
                console.error(error);
                this.message.error("数据格式错误");
            }
        }
        for (const num of ["2", "3", "4", "5"]) {
            if (!this.jiaowei.data[num]) {
                this.jiaowei.addItem({条件: [`门铰数量==${num}`]});
            }
        }
    }

    submit() {
        const {id, encode} = this.router.snapshot.queryParams;
        const tableData = {vid: id, jiaowei: JSON.stringify(this.jiaowei.export())};
        this.dataService.post("jichu/jichu/table_update/" + encode, {table: "p_menjiao", tableData});
    }
}
