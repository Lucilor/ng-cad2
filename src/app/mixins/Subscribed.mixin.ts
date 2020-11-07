import {OnDestroy} from "@angular/core";
import {Observable, Subject} from "rxjs";
import {takeUntil} from "rxjs/operators";
import {Constructor} from "../utils/types";

export const Subscribed = <T extends Constructor>(base: T = class {} as T) =>
    class extends base implements OnDestroy {
		destroyed$ = new Subject<void>();

		ngOnDestroy(): void {
		    this.destroyed$.next();
		}

		subscribe<T>(target: Observable<T>, next?: (value: T) => void, error?: (error: any) => void, complete?: () => void) {
		    return target.pipe(takeUntil(this.destroyed$)).subscribe(next, error, complete);
		}
    };
