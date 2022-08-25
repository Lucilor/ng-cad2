import {DragDropModule} from "@angular/cdk/drag-drop";
import {HttpClientModule} from "@angular/common/http";
import {Injectable, NgModule} from "@angular/core";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatNativeDateModule, MAT_DATE_LOCALE} from "@angular/material/core";
import {MatDatepickerModule} from "@angular/material/datepicker";
import {MatDialogModule} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatFormFieldDefaultOptions, MatFormFieldModule, MAT_FORM_FIELD_DEFAULT_OPTIONS} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatListModule} from "@angular/material/list";
import {MatMenuModule} from "@angular/material/menu";
import {MatPaginatorIntl, MatPaginatorModule} from "@angular/material/paginator";
import {MatRadioModule} from "@angular/material/radio";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatTableModule} from "@angular/material/table";
import {MatTabsModule} from "@angular/material/tabs";
import {MatTooltipModule} from "@angular/material/tooltip";
import {BrowserModule} from "@angular/platform-browser";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {AnchorSelectorComponent} from "@components/anchor-selector/anchor-selector.component";
import {CadLayerInputComponent} from "@components/cad-layer-input/cad-layer-input.component";
import {CadPointsComponent} from "@components/cad-points/cad-points.component";
import {BancaiListComponent} from "@components/dialogs/bancai-list/bancai-list.component";
import {BbzhmkgzComponent} from "@components/dialogs/bbzhmkgz/bbzhmkgz.component";
import {CadDataAttrsComponent} from "@components/dialogs/cad-data-attrs/cad-data-attrs.component";
import {CadDimensionFormComponent} from "@components/dialogs/cad-dimension-form/cad-dimension-form.component";
import {CadLineTjqzSelectComponent} from "@components/dialogs/cad-line-tjqz-select/cad-line-tjqz-select.component";
import {CadLineTjqzComponent} from "@components/dialogs/cad-line-tjqz/cad-line-tjqz.component";
import {CadListComponent} from "@components/dialogs/cad-list/cad-list.component";
import {CadOptionsComponent} from "@components/dialogs/cad-options/cad-options.component";
import {CadSearchFormComponent} from "@components/dialogs/cad-search-form/cad-search-form.component";
import {CadZhankaiComponent} from "@components/dialogs/cad-zhankai/cad-zhankai.component";
import {ChangelogComponent} from "@components/dialogs/changelog/changelog.component";
import {JsonEditorComponent} from "@components/dialogs/json-editor/json-editor.component";
import {KlkwpzDialogComponent} from "@components/dialogs/klkwpz-dialog/klkwpz-dialog.component";
import {LoginFormComponent} from "@components/dialogs/login-form/login-form.component";
import {SelectBancaiCadsComponent} from "@components/dialogs/select-bancai-cads/select-bancai-cads.component";
import {ZixuanpeijianComponent} from "@components/dialogs/zixuanpeijian/zixuanpeijian.component";
import {KlkwpzComponent} from "@components/klkwpz/klkwpz.component";
import {CadAssembleComponent} from "@components/menu/cad-assemble/cad-assemble.component";
import {CadDimensionComponent} from "@components/menu/cad-dimension/cad-dimension.component";
import {CadInfoComponent} from "@components/menu/cad-info/cad-info.component";
import {CadLineComponent} from "@components/menu/cad-line/cad-line.component";
import {CadMtextComponent} from "@components/menu/cad-mtext/cad-mtext.component";
import {CadSplitComponent} from "@components/menu/cad-split/cad-split.component";
import {SubCadsComponent} from "@components/menu/sub-cads/sub-cads.component";
import {ToolbarComponent} from "@components/menu/toolbar/toolbar.component";
import {ProgressBarComponent} from "@components/progress-bar/progress-bar.component";
import {JiaoweiComponent} from "@views/jiaowei/jiaowei.component";
import {ReplaceFullCharsDirective} from "@directives/replace-full-chars.directive";
import {CadConsoleModule} from "@modules/cad-console/cad-console.module";
import {HttpModule} from "@modules/http/http.module";
import {ImageModule} from "@modules/image/image.module";
import {InputModule} from "@modules/input/input.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {TableModule} from "@modules/table/table.module";
import {BackupComponent} from "@views/backup/backup.component";
import {ChangelogAdminComponent} from "@views/changelog-admin/changelog-admin.component";
import {DingdanbiaoqianComponent} from "@views/dingdanbiaoqian/dingdanbiaoqian.component";
import {ExportComponent} from "@views/export/export.component";
import {ImportComponent} from "@views/import/import.component";
import {IndexComponent} from "@views/index/index.component";
import {KailiaokongweipeizhiComponent} from "@views/kailiaokongweipeizhi/kailiaokongweipeizhi.component";
import {PageNotFoundComponent} from "@views/page-not-found/page-not-found.component";
import {PiliangjianbanComponent} from "@views/piliangjianban/piliangjianban.component";
import {PrintA4A015PreviewComponent} from "@views/print-a4-a015-preview/print-a4-a015-preview.component";
import {PrintCadComponent} from "@views/print/print-cad.component";
import {ReplaceTextComponent} from "@views/replace-text/replace-text.component";
import {SelectBancaiComponent} from "@views/select-bancai/select-bancai.component";
import {SelectCadsComponent} from "@views/select-cads/select-cads.component";
import {NgJsonEditorModule} from "ang-jsoneditor";
import {RecaptchaV3Module, RECAPTCHA_V3_SITE_KEY, RECAPTCHA_BASE_URL} from "ng-recaptcha";
import {ColorChromeModule} from "ngx-color/chrome";
import {ColorCircleModule} from "ngx-color/circle";
import {InfiniteScrollModule} from "ngx-infinite-scroll";
import {NgScrollbarModule} from "ngx-scrollbar";
import {AppRoutingModule} from "./app-routing.module";
import {AppComponent} from "./app.component";

@Injectable()
class MyMatPaginatorIntl extends MatPaginatorIntl {
    itemsPerPageLabel = "每页条数";
    previousPageLabel = "上一页";
    nextPageLabel = "下一页";
    firstPageLabel = "首页";
    lastPageLabel = "尾页";

    getRangeLabel = (page: number, pageSize: number, length: number) => {
        const totalPage = Math.ceil(length / pageSize);
        return `第${page + 1}/${totalPage}页，共${length}条`;
    };
}

const matFormFieldOptions: MatFormFieldDefaultOptions = {
    appearance: "fill",
    floatLabel: "always"
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
        CadAssembleComponent,
        SelectBancaiComponent,
        SelectBancaiCadsComponent,
        CadZhankaiComponent,
        CadDataAttrsComponent,
        ChangelogComponent,
        ChangelogAdminComponent,
        ReplaceFullCharsDirective,
        KailiaokongweipeizhiComponent,
        ReplaceTextComponent,
        PiliangjianbanComponent,
        LoginFormComponent,
        ExportComponent,
        ProgressBarComponent,
        SelectCadsComponent,
        BbzhmkgzComponent,
        CadSplitComponent,
        CadLayerInputComponent,
        DingdanbiaoqianComponent,
        ZixuanpeijianComponent,
        BancaiListComponent,
        KlkwpzComponent,
        KlkwpzDialogComponent,
        JiaoweiComponent
    ],
    imports: [
        AppRoutingModule,
        BrowserAnimationsModule,
        BrowserModule,
        ColorChromeModule,
        ColorCircleModule,
        DragDropModule,
        FormsModule,
        HttpClientModule,
        ImageModule,
        InfiniteScrollModule,
        MatAutocompleteModule,
        MatButtonModule,
        MatCardModule,
        MatCheckboxModule,
        MatDatepickerModule,
        MatDialogModule,
        MatDividerModule,
        MatExpansionModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatListModule,
        MatMenuModule,
        MatNativeDateModule,
        MatPaginatorModule,
        MatRadioModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatTableModule,
        MatTabsModule,
        MatTooltipModule,
        NgJsonEditorModule,
        NgScrollbarModule,
        ReactiveFormsModule,
        RecaptchaV3Module,
        CadConsoleModule,
        HttpModule,
        MessageModule,
        TableModule,
        SpinnerModule,
        InputModule
    ],
    providers: [
        {provide: MatPaginatorIntl, useClass: MyMatPaginatorIntl},
        {provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: matFormFieldOptions},
        {provide: MAT_DATE_LOCALE, useValue: "zh-CN"},
        {provide: RECAPTCHA_V3_SITE_KEY, useValue: "6Leil-0ZAAAAACnzpTud2QN5OuhJ10UyJJrUq70m"},
        {provide: RECAPTCHA_BASE_URL, useValue: "https://recaptcha.net/recaptcha/api.js"}
    ],
    bootstrap: [AppComponent]
})
export class AppModule {}
