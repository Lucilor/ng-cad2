import {ComponentType} from "@angular/cdk/portal";
import {MatDialog, MatDialogConfig} from "@angular/material/dialog";

export const getOpenDialogFunc =
    <T, D, R>(component: ComponentType<T>, defaultConfig: MatDialogConfig<D> = {}) =>
        async (dialog: MatDialog, config: MatDialogConfig<D> = {}) => {
            const ref = dialog.open<T, D, R>(component, {...defaultConfig, ...config});
            return await ref.afterClosed().toPromise();
        };
