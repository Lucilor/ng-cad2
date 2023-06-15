import {Component, OnInit, ViewChild} from "@angular/core";
import {setGlobal} from "@app/app.common";
import {ObjectOf, Timer} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {CustomResponse} from "@modules/http/services/http.service.types";
import {InputInfo} from "@modules/input/components/input.types";
import {NgScrollbar} from "ngx-scrollbar";

@Component({
  selector: "app-clean",
  templateUrl: "./clean.component.html",
  styleUrls: ["./clean.component.scss"]
})
export class CleanComponent implements OnInit {
  msgs: Msg[] = [];
  maxMsgNum = 100;
  deleteLimit = 50;
  deleteLimitInfo: InputInfo = {type: "number", label: "每次删除数量", model: {key: "deleteLimit", data: this}};
  taskStartTime: number | null = null;
  @ViewChild(NgScrollbar) scrollbar?: NgScrollbar;

  private _scrollToBottomTimer = -1;

  constructor(private dataService: CadDataService) {}

  ngOnInit() {
    setGlobal("clean", this);
  }

  pushMsg(type: MsgType, content: string, duration?: number, scrollToBottom = true) {
    if (duration) {
      content = content + ` (${Timer.getDurationString(duration, 2)})`;
    }
    const length = this.msgs.push({type, content});
    while (this.msgs.length > this.maxMsgNum) {
      this.msgs.shift();
    }
    if (scrollToBottom) {
      window.clearTimeout(this._scrollToBottomTimer);
      this._scrollToBottomTimer = window.setTimeout(() => {
        this.scrollbar?.scrollTo({bottom: 0});
      }, 500);
    }
    return length - 1;
  }

  pushResponseMsg<T>(response: CustomResponse<T> | null, defaultSuccess: string, defaultError: string) {
    if (response) {
      const {code, msg, duration} = response;
      if (code === 0) {
        this.pushMsg("success", msg || defaultSuccess, duration);
        return true;
      } else {
        this.pushMsg("error", msg || defaultError, duration);
        return false;
      }
    } else {
      this.pushMsg("error", defaultError);
      return false;
    }
  }

  pushMsgDivider() {
    const lastMsg = this.msgs.at(-1);
    if (lastMsg && lastMsg.type !== "divider") {
      return this.msgs.push({type: "divider", content: ""});
    }
    return null;
  }

  pushMsgProgress(content: string, current: number, total: number) {
    const percent = ((current / total) * 100).toFixed(2);
    const length = 20;
    const leftLength = Math.floor((current / total) * length);
    const rightLength = length - leftLength;
    const leftStr = Array(leftLength).fill("=").join("");
    const rightStr = Array(rightLength).fill("-").join("");
    return this.pushMsg("progress", `${content} [${leftStr}${rightStr}] ${current}/${total} ${percent}%`);
  }

  start() {
    this.taskStartTime = performance.now();
    this.step1();
  }

  end(response?: CustomResponse<void> | null) {
    const duration = this.taskStartTime ? performance.now() - this.taskStartTime : 0;
    this.pushMsgDivider();
    if (response?.code === 0) {
      this.pushMsg("success", response.msg || "清理完成", duration);
    } else {
      this.pushMsg("error", response?.msg || "清理失败", duration);
    }
    this.taskStartTime = null;
  }

  async step1() {
    this.pushMsgDivider();
    this.pushMsg("info", "开始清理任务");
    const response = await this.dataService.post<void>("clean/clean/runCleanStep1", {}, {silent: true});
    const success = this.pushResponseMsg(response, "步骤1完成", "步骤1失败");
    if (success) {
      this.step2();
    } else {
      this.end();
    }
  }

  async step2() {
    this.pushMsgDivider();
    this.pushMsg("info", "获取需要获取资源文件的项目");
    const response = await this.dataService.post<string[]>("clean/clean/runCleanStep2", {}, {silent: true});
    let projects: string[];
    if (response?.code === 0) {
      projects = response.data || [];
      const total = projects.length;
      this.pushMsg("info", `共有${total}个项目需要获取资源文件: ${projects.join(", ")}`);
      let progressIndex = -1;
      for (const [i, project] of projects.entries()) {
        if (progressIndex >= 0) {
          this.msgs.splice(progressIndex, 1);
        }
        progressIndex = this.pushMsgProgress(`项目${project}获取资源文件`, i + 1, total);
        const response2 = await this.dataService.post<string[]>("clean/clean/runCleanStep2", {project}, {silent: true});
        this.pushResponseMsg(response2, `项目${project}获取资源文件成功`, `项目${project}获取资源文件失败`);
        if (response2?.code !== 0) {
          this.end();
          return;
        }
      }
      this.step3();
    } else {
      this.pushMsg("error", response?.msg || "步骤2失败");
      this.end();
    }
  }

  async step3() {
    this.pushMsgDivider();
    const response = await this.dataService.post("clean/clean/runCleanStep3", {}, {silent: true});
    const success = this.pushResponseMsg(response, "步骤3完成", "步骤3失败");
    if (success) {
      this.step4();
    } else {
      this.end();
    }
  }

  async step4() {
    this.pushMsgDivider();
    this.pushMsg("info", "获取要删除的文件");
    let count = 0;
    let initial = true;
    if (this.deleteLimit <= 0) {
      this.end();
      return;
    }
    do {
      const response = await this.dataService.post<{success: ObjectOf<any>[]; error: ObjectOf<any> & {error: string}[]}>(
        "clean/clean/runCleanStep4",
        {limit: this.deleteLimit, initial},
        {silent: true}
      );
      if (response?.code === 0 && response.data) {
        count = response.count || 0;
        const {success, error} = response.data;
        if (initial) {
          this.pushMsg("info", `共有${count}个文件要删除`, response.duration);
        } else {
          if (success.length) {
            this.pushMsg("success", `${success.length}个文件删除成功`);
          }
          if (error.length > 0) {
            this.pushMsg("error", `${success.length}个文件删除失败`);
          }
          if (count > 0) {
            this.pushMsg("info", `还有${count}个文件要删除`, response.duration);
          }
        }
        initial = false;
      } else {
        this.pushMsg("info", response?.msg || "步骤4失败");
        this.end();
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
    this.pushMsgDivider();
    this.pushMsg("info", "创建清理任务");
    const response = await this.dataService.post<void>("clean/clean/createClean", {}, {silent: true});
    this.pushResponseMsg(response, "创建清理任务成功", "创建清理任务失败");
  }

  async resetClean() {
    this.pushMsgDivider();
    const response = await this.dataService.post<void>("clean/clean/resetNotFinishedClean", {}, {silent: true});
    this.pushResponseMsg(response, "重置清理任务成功", "重置清理任务失败");
  }

  clearMsgs() {
    this.msgs.length = 0;
  }
}

export interface Msg {
  type: MsgType;
  content: string;
}

export type MsgType = "info" | "success" | "warning" | "error" | "divider" | "progress";
