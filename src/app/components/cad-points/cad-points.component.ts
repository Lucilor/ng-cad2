import {Component, OnInit} from "@angular/core";
import {Subscribed} from "@mixins/subscribed.mixin";
import {AppConfigService} from "@services/app-config.service";
import {AppStatusService, CadPoints} from "@services/app-status.service";
import CSS from "csstype";

@Component({
    selector: "app-cad-points",
    templateUrl: "./cad-points.component.html",
    styleUrls: ["./cad-points.component.scss"]
})
export class CadPointsComponent extends Subscribed() implements OnInit {
    points: CadPoints = [];

    constructor(private config: AppConfigService, private status: AppStatusService) {
        super();
    }

    ngOnInit() {
        this.subscribe(this.status.cadPoints$, (points) => (this.points = points));
    }

    onPointClick(index: number) {
        const points = this.points;
        points[index].active = !points[index].active;
        this.status.cadPoints$.next(points);
    }

    getStyle(p: CadPoints[0]) {
        const size = this.config.getConfig("pointSize");
        return {
            width: `${size}px`,
            height: `${size}px`,
            left: `${p.x}px`,
            top: `${p.y}px`
        } as CSS.Properties;
    }
}
