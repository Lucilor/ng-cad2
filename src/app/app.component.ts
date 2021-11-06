import {Component, OnInit} from "@angular/core";
import {NavigationEnd, Router} from "@angular/router";
import {environment} from "@env";
import {Utils} from "@mixins/utils.mixin";
import {routesInfo} from "./app.common";
import {AppStatusService} from "./services/app-status.service";

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.scss"]
})
export class AppComponent extends Utils() implements OnInit {
    title = "ng-cad2";
    loaderText = "";
    isProd = environment.production;
    routesInfo = routesInfo;

    constructor(private status: AppStatusService, private router: Router) {
        super();
    }

    ngOnInit() {
        this.status.loaderText$.subscribe((loaderText) => {
            this.loaderText = loaderText;
        });
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                const url = event.urlAfterRedirects;
                const routeInfo = Object.values(routesInfo).find((v) => url.startsWith("/" + v.path));
                if (routeInfo?.title) {
                    document.title = routeInfo.title;
                }
            }
        });
    }
}
