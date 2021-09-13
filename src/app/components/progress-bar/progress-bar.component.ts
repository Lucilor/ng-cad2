import {Component, Input} from "@angular/core";
import {ProgressBar} from "@utils";

export type ProgressBarStatus = "hidden" | "progress" | "success" | "error";

@Component({
    selector: "app-progress-bar[progressBar]",
    templateUrl: "./progress-bar.component.html",
    styleUrls: ["./progress-bar.component.scss"]
})
export class ProgressBarComponent {
    @Input()
    progressBar = new ProgressBar(1);
    @Input()
    status: ProgressBarStatus = "hidden";
    @Input()
    msg = "";
}
