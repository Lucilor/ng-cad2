import {Component, OnInit, Input, OnDestroy} from "@angular/core";
import {Observable, Subject} from "rxjs";
import {State} from "@src/app/store/state";
import {Store} from "@ngrx/store";
import {getCadPoints} from "@src/app/store/selectors";
import {CadPointsAction} from "@src/app/store/actions";

@Component({
	selector: "app-cad-points",
	templateUrl: "./cad-points.component.html",
	styleUrls: ["./cad-points.component.scss"]
})
export class CadPointsComponent implements OnInit, OnDestroy {
	points: Observable<State["cadPoints"]>;
	destroyed = new Subject();

	constructor(private store: Store<State>) {}

	ngOnInit() {
		this.points = this.store.select(getCadPoints);
	}

	ngOnDestroy() {
		this.destroyed.next();
	}

	onPointClick(index: number) {
		this.store.dispatch<CadPointsAction>({type: "activate cad points" , indices: [index]});
	}
}
