import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatSortModule} from "@angular/material/sort";
import {MatTableModule} from "@angular/material/table";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";
import {TableComponent} from "./components/table/table.component";

@NgModule({
    declarations: [TableComponent],
    imports: [
        CommonModule,
        MatCheckboxModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatSortModule,
        MatTableModule,
        PerfectScrollbarModule
    ],
    exports: [TableComponent]
})
export class TableModule {}
