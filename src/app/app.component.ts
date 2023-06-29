import {Component} from "@angular/core";
import {ActivatedRoute, ResolveFn, Router} from "@angular/router";
import {environment} from "@env";
import {routesInfo} from "./routing/routes-info";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent {
  title = "ng-cad2";
  loaderText = "";
  isProd = environment.production;
  routesInfo = routesInfo;

  constructor(private router: Router, private route: ActivatedRoute) {}

  getRouteTitle(routeInfo: (typeof routesInfo)[number]) {
    const {title, path} = routeInfo;
    if (typeof title === "function") {
      return (title as ResolveFn<string>)(this.route.snapshot, this.router.routerState.snapshot);
    }
    return title || path;
  }
}
