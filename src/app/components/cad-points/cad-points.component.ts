import {Component} from "@angular/core";
import {AppStatusService} from "@src/app/services/app-status.service";
import {Subscribed} from "@src/app/mixins/Subscribed.mixin";

@Component({
    selector: "app-cad-points",
    templateUrl: "./cad-points.component.html",
    styleUrls: ["./cad-points.component.scss"]
})
export class CadPointsComponent extends Subscribed() {
	points$ = this.status.cadPoints$;

	constructor(private status: AppStatusService) {
	    super();
	}

	onPointClick(index: number) {
	    const points = this.points$.getValue();
	    points[index].active = true;
	    this.points$.next(points);
	}
}
