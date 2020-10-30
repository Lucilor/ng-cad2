import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";

import {MatButtonModule} from "@angular/material/button";
import {MatDialogModule, MAT_DIALOG_DEFAULT_OPTIONS} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";

import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";

import {MessageComponent} from "./components/message/message.component";

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
		PerfectScrollbarModule
	],
	providers: [{provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: {maxWidth: "unset"}}]
})
export class MessageModule {}
