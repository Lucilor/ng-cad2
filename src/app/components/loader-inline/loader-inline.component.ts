import {Component, Input} from "@angular/core";
import {uniqueId} from "lodash";

@Component({
    selector: "app-loader-inline",
    templateUrl: "./loader-inline.component.html",
    styleUrls: ["./loader-inline.component.scss"]
})
export class LoaderInlineComponent {
    @Input()
    loaderId = uniqueId("loader-inline-");
}
