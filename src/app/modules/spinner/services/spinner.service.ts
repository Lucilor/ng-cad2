import {Injectable} from "@angular/core";
import {NgxUiLoaderService} from "ngx-ui-loader";
import {BehaviorSubject} from "rxjs";

@Injectable({
    providedIn: "root"
})
export class SpinnerService {
    spinnerShow$ = new BehaviorSubject<{id: string; text?: string}>({id: ""});
    spinnerHide$ = new BehaviorSubject<{id: string}>({id: ""});
    defaultLoaderId = "master";

    constructor(private loader: NgxUiLoaderService) {}

    show(id: string, config?: {text?: string}) {
        this.loader.startLoader(id);
        this.spinnerShow$.next({id, ...config});
    }

    hide(id: string) {
        this.loader.stopLoader(id);
        this.spinnerHide$.next({id});
    }
}
