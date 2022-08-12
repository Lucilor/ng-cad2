import {Injectable} from "@angular/core";
import {ObjectOf} from "@utils";
import {NgxUiLoaderService} from "ngx-ui-loader";
import {BehaviorSubject} from "rxjs";

export interface SpinnerConfig {
    text?: string;
}

@Injectable({
    providedIn: "root"
})
export class SpinnerService {
    spinnerShow$ = new BehaviorSubject<{id: string; config?: SpinnerConfig}>({id: ""});
    spinnerHide$ = new BehaviorSubject<{id: string}>({id: ""});
    defaultLoaderId = "master";
    shownSpinners: ObjectOf<SpinnerConfig> = {};

    constructor(private loader: NgxUiLoaderService) {
        this.spinnerShow$.subscribe(({id, config}) => {
            this.shownSpinners[id] = config || {};
        });
        this.spinnerHide$.subscribe(({id}) => delete this.shownSpinners[id]);
    }

    show(id: string, config?: SpinnerConfig) {
        this.loader.startLoader(id);
        this.spinnerShow$.next({id, config});
    }

    hide(id: string) {
        this.loader.stopLoader(id);
        this.spinnerHide$.next({id});
    }
}
