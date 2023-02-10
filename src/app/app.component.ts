import {Component} from "@angular/core";
import {environment} from "@env";
import {routesInfo} from "./app-routing.module";

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

  constructor() {}
}
