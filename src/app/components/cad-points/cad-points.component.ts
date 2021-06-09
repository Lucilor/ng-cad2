import {Component, OnInit} from "@angular/core";
import {Subscribed} from "@mixins/subscribed.mixin";
import {AppStatusService, CadPoints} from "@services/app-status.service";

@Component({
    selector: "app-cad-points",
    templateUrl: "./cad-points.component.html",
    styleUrls: ["./cad-points.component.scss"]
})
export class CadPointsComponent extends Subscribed() implements OnInit {
    points: CadPoints = [];

    constructor(private status: AppStatusService) {
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
}
