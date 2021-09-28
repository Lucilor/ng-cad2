import {Component, Input} from "@angular/core";
import {ListRandom, ProgressBar} from "@utils";

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

    clickTextsRandom = new ListRandom([
        "(〃'▽'〃)",
        "φ(>ω<*) ",
        "(｡･ω･｡)",
        "( ･´ω`･ )",
        "ヾ(=･ω･=)o",
        "(>ω･* )ﾉ",
        "(*･ω-q) ",
        "ヽ(･ω･´ﾒ)",
        "d(´ω｀*)"
    ]);
    clickText: string | null = null;

    onPointerDown() {
        this.clickText = this.clickTextsRandom.next();
    }

    onPointerUp() {
        this.clickText = null;
    }
}
