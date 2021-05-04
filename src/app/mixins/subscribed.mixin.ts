import {OnDestroy} from "@angular/core";
import {Observable, Subject} from "rxjs";
import {takeUntil} from "rxjs/operators";
import {Constructor} from "@lucilor/utils";

export const Subscribed = <T extends Constructor>(base: T = class {} as T) =>
    class extends base implements OnDestroy {
        destroyed$ = new Subject<void>();

        ngOnDestroy(): void {
            this.destroyed$.next();
        }

        subscribe<K>(target: Observable<K>, next?: (value: K) => void, onError?: (error: any) => void, onComplete?: () => void) {
            return target.pipe(takeUntil(this.destroyed$)).subscribe(next, onError, onComplete);
        }
    };
