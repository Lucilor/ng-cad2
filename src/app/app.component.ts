import {Component} from "@angular/core";
import {Router} from "@angular/router";
import {environment} from "@env";
import {Utils} from "@mixins/utils.mixin";
import {routesInfo} from "./app-routing.module";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent extends Utils() {
  title = "ng-cad2";
  loaderText = "";
  isProd = environment.production;
  routesInfo = routesInfo;

  constructor(private router: Router) {
    super();
  }
}
