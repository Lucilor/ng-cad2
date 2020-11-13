import {HttpClientModule} from "@angular/common/http";
import {Injectable, NgModule} from "@angular/core";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {BrowserModule} from "@angular/platform-browser";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {AppRoutingModule} from "./app-routing.module";
import {AppComponent} from "./app.component";

import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatDialogModule} from "@angular/material/dialog";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatListModule} from "@angular/material/list";
import {MatMenuModule} from "@angular/material/menu";
import {MatPaginatorModule, MatPaginatorIntl} from "@angular/material/paginator";
import {MatRadioModule} from "@angular/material/radio";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatSnackBarModule, MAT_SNACK_BAR_DEFAULT_OPTIONS} from "@angular/material/snack-bar";
import {MatTableModule} from "@angular/material/table";
import {MatTabsModule} from "@angular/material/tabs";
import {MatTooltipModule} from "@angular/material/tooltip";

import {ColorChromeModule} from "ngx-color/chrome";
import {ColorCircleModule} from "ngx-color/circle";
import {SatPopoverModule} from "@ncstate/sat-popover";
import {NgJsonEditorModule} from "ang-jsoneditor";
import {PerfectScrollbarModule, PerfectScrollbarConfigInterface, PERFECT_SCROLLBAR_CONFIG} from "ngx-perfect-scrollbar";
import {NgxUiLoaderModule, SPINNER} from "ngx-ui-loader";

import {CadConsoleModule} from "@src/app/modules/cad-console/cad-console.module";
import {HttpModule} from "./modules/http/http.module";
import {MessageModule} from "@src/app/modules/message/message.module";
import {TableModule} from "@src/app/modules/table/table.module";

import {IndexComponent} from "./views/index/index.component";
import {PageNotFoundComponent} from "./views/page-not-found/page-not-found.component";
import {ToolbarComponent} from "./components/menu/toolbar/toolbar.component";
import {JsonEditorComponent} from "./components/dialogs/json-editor/json-editor.component";
import {CadSearchFormComponent} from "./components/dialogs/cad-search-form/cad-search-form.component";
import {CadListComponent} from "./components/dialogs/cad-list/cad-list.component";
import {SubCadsComponent} from "./components/menu/sub-cads/sub-cads.component";
import {CadInfoComponent} from "./components/menu/cad-info/cad-info.component";
import {CadOptionsComponent} from "./components/dialogs/cad-options/cad-options.component";
import {ImageComponent} from "./components/image/image.component";
import {CadPointsComponent} from "./components/cad-points/cad-points.component";
import {CadLineComponent} from "./components/menu/cad-line/cad-line.component";
import {CadLineTjqzComponent} from "./components/dialogs/cad-line-tjqz/cad-line-tjqz.component";
import {CadLineTjqzSelectComponent} from "./components/dialogs/cad-line-tjqz-select/cad-line-tjqz-select.component";
import {CadMtextComponent} from "./components/menu/cad-mtext/cad-mtext.component";
import {AnchorSelectorComponent} from "./components/anchor-selector/anchor-selector.component";
import {CadDimensionComponent} from "./components/menu/cad-dimension/cad-dimension.component";
import {CadDimensionFormComponent} from "./components/dialogs/cad-dimension-form/cad-dimension-form.component";
import {ImportComponent} from "./components/views/import/import.component";
import {BackupComponent} from "./components/views/backup/backup.component";
import {PrintCadComponent} from "./components/views/print/print-cad.component";
import {PrintA4A015PreviewComponent} from "./components/views/print-a4-a015-preview/print-a4-a015-preview.component";
import {CadAssembleComponent} from "./components/menu/cad-assemble/cad-assemble.component";

@Injectable()
export class MyMatPaginatorIntl extends MatPaginatorIntl {
    itemsPerPageLabel = "每页条数";
    previousPageLabel = "上一页";
    nextPageLabel = "下一页";
    firstPageLabel = "首页";
    lastPageLabel = "尾页";

    getRangeLabel = (page: number, pageSize: number, length: number) => {
        const totalPage = Math.ceil(length / pageSize);
        return `第${page + 1}页，共${totalPage}页`;
    };
}

const DEFAULT_PERFECT_SCROLLBAR_CONFIG: PerfectScrollbarConfigInterface = {
    wheelPropagation: true
};

@NgModule({
    declarations: [
        AppComponent,
        IndexComponent,
        PageNotFoundComponent,
        ToolbarComponent,
        JsonEditorComponent,
        CadSearchFormComponent,
        CadListComponent,
        SubCadsComponent,
        CadInfoComponent,
        CadOptionsComponent,
        ImageComponent,
        CadPointsComponent,
        CadLineComponent,
        CadLineTjqzComponent,
        CadLineTjqzSelectComponent,
        CadMtextComponent,
        AnchorSelectorComponent,
        CadDimensionComponent,
        CadDimensionFormComponent,
        ImportComponent,
        BackupComponent,
        PrintCadComponent,
        PrintA4A015PreviewComponent,
        CadAssembleComponent
    ],
    imports: [
        HttpClientModule,
        FormsModule,
        ReactiveFormsModule,
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        MatAutocompleteModule,
        MatButtonModule,
        MatCardModule,
        MatCheckboxModule,
        MatDialogModule,
        MatExpansionModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatListModule,
        MatMenuModule,
        MatPaginatorModule,
        MatRadioModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatSnackBarModule,
        MatTableModule,
        MatTabsModule,
        MatTooltipModule,
        ColorChromeModule,
        ColorCircleModule,
        SatPopoverModule,
        NgJsonEditorModule,
        PerfectScrollbarModule,
        NgxUiLoaderModule.forRoot({
            fgsColor: "#2196f3",
            bgsColor: "#2196f3",
            pbColor: "#2196f3",
            fgsType: SPINNER.threeStrings,
            bgsType: SPINNER.ballScaleMultiple
        }),
        CadConsoleModule,
        HttpModule,
        MessageModule,
        TableModule
    ],
    providers: [
        {
            provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
            useValue: {duration: 3000, verticalPosition: "top", panelClass: ["mat-toolbar", "mat-primary"]}
        },
        {provide: MatPaginatorIntl, useClass: MyMatPaginatorIntl},
        {provide: PERFECT_SCROLLBAR_CONFIG, useValue: DEFAULT_PERFECT_SCROLLBAR_CONFIG}
    ],
    bootstrap: [AppComponent]
})
export class AppModule {}
