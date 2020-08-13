import {Component, OnInit, OnDestroy} from "@angular/core";
import {Subject} from "rxjs";
import {State} from "@src/app/store/state";
import {Store} from "@ngrx/store";
import {getCadPoints} from "@src/app/store/selectors";
import {CadPointsAction} from "@src/app/store/actions";
import {takeUntil} from "rxjs/operators";

@Component({
	selector: "app-cad-points",
	templateUrl: "./cad-points.component.html",
	styleUrls: ["./cad-points.component.scss"]
})
export class CadPointsComponent implements OnInit, OnDestroy {
	points: State["cadPoints"];
	destroyed = new Subject();

	constructor(private store: Store<State>) {}

	ngOnInit() {
		this.store
			.select(getCadPoints)
			.pipe(takeUntil(this.destroyed))
			.subscribe(
				(points) =>
					(this.points = points.map((v) => {
						return {x: v.x, y: v.y, active: v.active};
					}))
			);
	}

	ngOnDestroy() {
		this.destroyed.next();
	}

	onPointClick(i: number) {
		this.points[i].active = true;
		this.store.dispatch<CadPointsAction>({type: "set cad points", points: this.points});
	}
}
