import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";

import {MatButtonModule} from "@angular/material/button";
import {MatDialogModule, MAT_DIALOG_DEFAULT_OPTIONS} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";

import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";

import {MessageComponent} from "./components/message/message.component";
import {MatSnackBarModule, MAT_SNACK_BAR_DEFAULT_OPTIONS} from "@angular/material/snack-bar";

@NgModule({
    declarations: [MessageComponent],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatDialogModule,
        MatInputModule,
        MatSnackBarModule,
        PerfectScrollbarModule
    ],
    providers: [
        {provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: {maxWidth: "unset"}},
        {
            provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
            useValue: {duration: 3000, verticalPosition: "top", panelClass: ["mat-toolbar", "mat-primary"]}
        }
    ]
})
export class MessageModule {}
