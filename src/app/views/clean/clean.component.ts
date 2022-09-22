import {Component, OnInit, ViewChild} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {CustomResponse} from "@modules/http/services/http.service";
import {InputInfo} from "@modules/input/components/types";
import {ObjectOf, Timer} from "@utils";
import {NgScrollbar} from "ngx-scrollbar";

@Component({
    selector: "app-clean",
    templateUrl: "./clean.component.html",
    styleUrls: ["./clean.component.scss"]
})
export class CleanComponent implements OnInit {
    msgs: Msg[] = [];
    maxMsgNum = 100;
    deleteLimit = 10;
    deleteLimitInfo: InputInfo = {type: "number", label: "每次删除数量", model: {key: "deleteLimit", data: this}};
    taskStartTime: number | null = null;
    @ViewChild(NgScrollbar) scrollbar?: NgScrollbar;

    constructor(private dataService: CadDataService, private route: ActivatedRoute) {}

    ngOnInit() {
        const {direct} = this.route.snapshot.queryParams;
        if (direct) {
            this.start();
        }
    }

    addMsg(type: MsgType, content: string, duration?: number) {
        if (duration) {
            content = content + ` (${Timer.getDurationString(duration, 2)})`;
        }
        this.msgs.push({type, content});
        while (this.msgs.length > this.maxMsgNum) {
            this.msgs.shift();
        }
        setTimeout(() => {
            this.scrollbar?.scrollTo({bottom: 0});
        }, 500);
    }

    addResponseMsg<T>(response: CustomResponse<T> | null, defaultSuccess: string, defaultError: string) {
        if (response) {
            const {code, msg, duration} = response;
            if (code === 0) {
                this.addMsg("success", msg || defaultSuccess, duration);
                return true;
            } else {
                this.addMsg("error", msg || defaultError, duration);
                return false;
            }
        } else {
            this.addMsg("error", defaultError);
            return false;
        }
    }

    addMsgDivider() {
        const lastMsg = this.msgs.at(-1);
        if (lastMsg && lastMsg.type !== "divider") {
            this.msgs.push({type: "divider", content: ""});
        }
    }

    start() {
        this.taskStartTime = performance.now();
        this.step1();
    }

    end(response?: CustomResponse<void> | null) {
        const duration = this.taskStartTime ? performance.now() - this.taskStartTime : 0;
        this.addMsgDivider();
        if (response?.code === 0) {
            this.addMsg("success", response.msg || "清理完成", duration);
        } else {
            this.addMsg("error", response?.msg || "清理失败", duration);
        }
        this.taskStartTime = null;
    }

    async step1() {
        this.addMsgDivider();
        this.addMsg("info", "开始清理任务");
        const response = await this.dataService.post<void>("clean/clean/runCleanStep1", {}, {silent: true});
        const success = this.addResponseMsg(response, "步骤1完成", "步骤1失败");
        if (success) {
            this.step2();
        } else {
            this.end();
        }
    }

    async step2() {
        this.addMsgDivider();
        this.addMsg("info", "获取要清理的项目");
        const response = await this.dataService.post<string[]>("clean/clean/runCleanStep2", {}, {silent: true});
        let projects: string[];
        if (response?.code === 0) {
            projects = response.data || [];
            const total = projects.length;
            if (total < 1) {
                this.addMsg("error", "没有要清理的项目");
                return;
            }
            this.addMsg("info", `共有${total}个项目需要清理: ${projects.join(", ")}`);
            for (const project of projects) {
                this.addMsg("info", `项目${project}获取资源文件`);
                const response2 = await this.dataService.post<string[]>("clean/clean/runCleanStep2", {project}, {silent: true});
                this.addResponseMsg(response2, `项目${project}获取资源文件成功`, `项目${project}获取资源文件失败`);
            }
            this.step3();
        } else {
            this.addMsg("error", response?.msg || "步骤2失败");
            this.end();
        }
    }

    async step3() {
        this.addMsgDivider();
        const response = await this.dataService.post("clean/clean/runCleanStep3", {}, {silent: true});
        const success = this.addResponseMsg(response, "步骤3完成", "步骤3失败");
        if (success) {
            this.step4();
        } else {
            this.end();
        }
    }

    async step4() {
        this.addMsgDivider();
        this.addMsg("info", "获取要删除的文件");
        let count = 0;
        let initial = true;
        do {
            // if (!initial) {
            //     this.addMsg("info", `开始删除${this.deleteLimit}个文件`);
            // }
            const response = await this.dataService.post<{success: ObjectOf<any>[]; error: ObjectOf<any> & {error: string}[]}>(
                "clean/clean/runCleanStep4",
                {limit: this.deleteLimit, initial},
                {silent: true}
            );
            if (response?.code === 0 && response.data) {
                count = response.count || 0;
                const {success, error} = response.data;
                if (initial) {
                    this.addMsg("info", `共有${count}个文件要删除`, response.duration);
                } else {
                    if (success.length) {
                        this.addMsg("success", `${success.length}个文件删除成功`);
                    }
                    if (error.length > 0) {
                        this.addMsg("error", `${success.length}个文件删除失败`);
                    }
                    if (count > 0) {
                        this.addMsg("info", `还有${count}个文件要删除`, response.duration);
                    }
                }
                initial = false;
            } else {
                this.addMsg("info", response?.msg || "步骤4失败");
                return;
            }
        } while (count > 0);
        this.finfishClean();
    }

    async finfishClean() {
        const response = await this.dataService.post<void>("clean/clean/finishedClean", {}, {silent: true});
        this.end(response);
    }

    async createClean() {
        this.addMsgDivider();
        this.addMsg("info", "创建清理任务");
        const response = await this.dataService.post<void>("clean/clean/createClean", {}, {silent: true});
        this.addResponseMsg(response, "创建清理任务成功", "创建清理任务失败");
    }

    clearMsgs() {
        this.msgs.length = 0;
    }
}

export interface Msg {
    type: MsgType;
    content: string;
}

export type MsgType = "info" | "success" | "warning" | "error" | "divider";
