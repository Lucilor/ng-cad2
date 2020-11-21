import {Component, OnInit} from "@angular/core";
import {AppStatusService} from "./services/app-status.service";

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.scss"]
})
export class AppComponent implements OnInit {
    title = "ng-cad2";
    loaderText = "";

    constructor(private status: AppStatusService) {}

    ngOnInit() {
        this.status.loaderText$.subscribe((loaderText) => {
            this.loaderText = loaderText;
        });
    }
}
