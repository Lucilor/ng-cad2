import {Component} from "@angular/core";
import {AppStatusService} from "@src/app/services/app-status.service";

@Component({
    selector: "app-cad-points",
    templateUrl: "./cad-points.component.html",
    styleUrls: ["./cad-points.component.scss"]
})
export class CadPointsComponent {
    points$ = this.status.cadPoints$;

    constructor(private status: AppStatusService) {}

    onPointClick(index: number) {
        const points = this.points$.value;
        points[index].active = !points[index].active;
        this.points$.next(points);
    }
}
