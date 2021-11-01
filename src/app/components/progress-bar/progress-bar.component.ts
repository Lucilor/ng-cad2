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
        "(*^▽^*)",
        "(｡･ω･｡)",
        "✿(。◕ᴗ◕。)✿",
        "(^_−)☆",
        " (｡♥ᴗ♥｡) ",
        "๑乛◡乛๑",
        "ヽ(･ω･´ﾒ)",
        "(✪ω✪)",
        "(｡•ˇ‸ˇ•｡)",
        "o(ﾟДﾟ)っ！",
        "(❁´ω`❁)",
        "｡◕ᴗ◕｡",
        "(•ᴗ•)",
        "(づ●─●)づ",
        "ლ(❛◡❛✿)ლ",
        "ヽ(^ω^)ﾉ ",
        "(*❦ω❦)",
        "(๑•ω•๑)",
        "(o°ω°o)",
        "(╯︵╰)",
        "❥(ゝω・✿ฺ)",
        "✧(＾＿－✿ ",
        "★(－ｏ⌒) ",
        "(・ω<)"
    ]);
    clickText: string | null = null;

    onPointerDown() {
        this.clickText = this.clickTextsRandom.next();
    }

    onPointerUp() {
        this.clickText = null;
    }
}
