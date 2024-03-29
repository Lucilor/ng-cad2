import {DragDropModule} from "@angular/cdk/drag-drop";
import {HttpClientModule} from "@angular/common/http";
import {Injectable, NgModule} from "@angular/core";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MAT_DATE_LOCALE, MatNativeDateModule} from "@angular/material/core";
import {MatDatepickerModule} from "@angular/material/datepicker";
import {MatDialogModule} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatExpansionModule} from "@angular/material/expansion";
import {MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldDefaultOptions, MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatListModule} from "@angular/material/list";
import {MatMenuModule} from "@angular/material/menu";
import {MatPaginatorIntl, MatPaginatorModule} from "@angular/material/paginator";
import {MatRadioModule} from "@angular/material/radio";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatSliderModule} from "@angular/material/slider";
import {MatTableModule} from "@angular/material/table";
import {MatTabsModule} from "@angular/material/tabs";
import {MatTooltipModule} from "@angular/material/tooltip";
import {MatTreeModule} from "@angular/material/tree";
import {BrowserModule} from "@angular/platform-browser";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {BancaiFormComponent} from "@components/bancai-form/bancai-form.component";
import {BancaiFormDialogComponent} from "@components/dialogs/bancai-form-dialog/bancai-form-dialog.component";
import {BancaiListComponent} from "@components/dialogs/bancai-list/bancai-list.component";
import {BbzhmkgzComponent} from "@components/dialogs/bbzhmkgz/bbzhmkgz.component";
import {CadEditorDialogComponent} from "@components/dialogs/cad-editor-dialog/cad-editor-dialog.component";
import {CadLineTjqzSelectComponent} from "@components/dialogs/cad-line-tjqz-select/cad-line-tjqz-select.component";
import {CadLineTjqzComponent} from "@components/dialogs/cad-line-tjqz/cad-line-tjqz.component";
import {CadListComponent} from "@components/dialogs/cad-list/cad-list.component";
import {CadOptionsComponent} from "@components/dialogs/cad-options/cad-options.component";
import {CadSearchFormComponent} from "@components/dialogs/cad-search-form/cad-search-form.component";
import {CadZhankaiComponent} from "@components/dialogs/cad-zhankai/cad-zhankai.component";
import {ChangelogComponent} from "@components/dialogs/changelog/changelog.component";
import {DrawCadComponent} from "@components/dialogs/draw-cad/draw-cad.component";
import {EditFormulasDialogComponent} from "@components/dialogs/edit-formulas-dialog/edit-formulas-dialog.component";
import {KlcsDialogComponent} from "@components/dialogs/klcs-dialog/klcs-dialog.component";
import {KlkwpzDialogComponent} from "@components/dialogs/klkwpz-dialog/klkwpz-dialog.component";
import {LoginFormComponent} from "@components/dialogs/login-form/login-form.component";
import {MrbcjfzDialogComponent} from "@components/dialogs/mrbcjfz-dialog/mrbcjfz-dialog.component";
import {NavsDialogComponent} from "@components/dialogs/navs-dialog/navs-dialog.component";
import {SelectBancaiCadsComponent} from "@components/dialogs/select-bancai-cads/select-bancai-cads.component";
import {ZixuanpeijianComponent} from "@components/dialogs/zixuanpeijian/zixuanpeijian.component";
import {FormulasEditorComponent} from "@components/formulas-editor/formulas-editor.component";
import {FormulasComponent} from "@components/formulas/formulas.component";
import {KlcsComponent} from "@components/klcs/klcs.component";
import {KlkwpzComponent} from "@components/klkwpz/klkwpz.component";
import {MsbjRectsComponent} from "@components/msbj-rects/msbj-rects.component";
import {ProgressBarComponent} from "@components/progress-bar/progress-bar.component";
import {AngJsoneditorModule} from "@maaxgr/ang-jsoneditor";
import {CadConsoleModule} from "@modules/cad-console/cad-console.module";
import {CadEditorModule} from "@modules/cad-editor/cad-editor.module";
import {DirectivesModule} from "@modules/directives/directives.module";
import {HttpModule} from "@modules/http/http.module";
import {ImageModule} from "@modules/image/image.module";
import {InputModule} from "@modules/input/input.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {TableModule} from "@modules/table/table.module";
import {BackupComponent} from "@views/backup/backup.component";
import {BomGongyiluxianComponent} from "@views/bom-gongyiluxian/bom-gongyiluxian.component";
import {ChangelogAdminComponent} from "@views/changelog-admin/changelog-admin.component";
import {CleanComponent} from "@views/clean/clean.component";
import {DingdanbiaoqianComponent} from "@views/dingdanbiaoqian/dingdanbiaoqian.component";
import {ExportComponent} from "@views/export/export.component";
import {ImportComponent} from "@views/import/import.component";
import {IndexComponent} from "@views/index/index.component";
import {JiaoweiComponent} from "@views/jiaowei/jiaowei.component";
import {KailiaocanshuComponent} from "@views/kailiaocanshu/kailiaocanshu.component";
import {KailiaokongweipeizhiComponent} from "@views/kailiaokongweipeizhi/kailiaokongweipeizhi.component";
import {MrbcjfzComponent} from "@views/mrbcjfz/mrbcjfz.component";
import {MsbjComponent} from "@views/msbj/msbj.component";
import {PageNotFoundComponent} from "@views/page-not-found/page-not-found.component";
import {PiliangjianbanComponent} from "@views/piliangjianban/piliangjianban.component";
import {PjmkComponent} from "@views/pjmk/pjmk.component";
import {PrintA4A015PreviewComponent} from "@views/print-a4-a015-preview/print-a4-a015-preview.component";
import {PrintCadComponent} from "@views/print/print-cad.component";
import {ReplaceTextComponent} from "@views/replace-text/replace-text.component";
import {SelectBancaiComponent} from "@views/select-bancai/select-bancai.component";
import {SelectCadsComponent} from "@views/select-cads/select-cads.component";
import {SuanliaoComponent} from "@views/suanliao/suanliao.component";
import {XhmrmsbjMokuaisComponent} from "@views/xhmrmsbj-mokuais/xhmrmsbj-mokuais.component";
import {XhmrmsbjComponent} from "@views/xhmrmsbj/xhmrmsbj.component";
import {XinghaoOverviewComponent} from "@views/xinghao-overview/xinghao-overview.component";
import {RECAPTCHA_BASE_URL, RECAPTCHA_V3_SITE_KEY, RecaptchaV3Module} from "ng-recaptcha";
import {ColorChromeModule} from "ngx-color/chrome";
import {ColorCircleModule} from "ngx-color/circle";
import {InfiniteScrollModule} from "ngx-infinite-scroll";
import {QuillModule} from "ngx-quill";
import {NgScrollbarModule} from "ngx-scrollbar";
import {AppComponent} from "./app.component";
import {AppRoutingModule} from "./routing/app-routing.module";

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
    BackupComponent,
    BancaiFormComponent,
    BancaiFormDialogComponent,
    BancaiListComponent,
    BbzhmkgzComponent,
    BomGongyiluxianComponent,
    CadEditorDialogComponent,
    CadLineTjqzComponent,
    CadLineTjqzSelectComponent,
    CadListComponent,
    CadOptionsComponent,
    CadSearchFormComponent,
    CadZhankaiComponent,
    ChangelogAdminComponent,
    ChangelogComponent,
    CleanComponent,
    DingdanbiaoqianComponent,
    DrawCadComponent,
    EditFormulasDialogComponent,
    ExportComponent,
    FormulasComponent,
    FormulasEditorComponent,
    ImportComponent,
    IndexComponent,
    JiaoweiComponent,
    KailiaocanshuComponent,
    KailiaokongweipeizhiComponent,
    KlcsComponent,
    KlcsDialogComponent,
    KlkwpzComponent,
    KlkwpzDialogComponent,
    LoginFormComponent,
    MrbcjfzComponent,
    MrbcjfzDialogComponent,
    MsbjComponent,
    MsbjRectsComponent,
    NavsDialogComponent,
    PageNotFoundComponent,
    PiliangjianbanComponent,
    PjmkComponent,
    PrintA4A015PreviewComponent,
    PrintCadComponent,
    ProgressBarComponent,
    ReplaceTextComponent,
    SelectBancaiCadsComponent,
    SelectBancaiComponent,
    SelectCadsComponent,
    SuanliaoComponent,
    XhmrmsbjComponent,
    XhmrmsbjMokuaisComponent,
    XinghaoOverviewComponent,
    ZixuanpeijianComponent
  ],
  imports: [
    AngJsoneditorModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    BrowserModule,
    CadConsoleModule,
    CadEditorModule,
    ColorChromeModule,
    ColorCircleModule,
    DirectivesModule,
    DragDropModule,
    FormsModule,
    HttpClientModule,
    HttpModule,
    ImageModule,
    InfiniteScrollModule,
    InputModule,
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
    MatSliderModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTabsModule,
    MatTooltipModule,
    MatTreeModule,
    MessageModule,
    NgScrollbarModule,
    QuillModule.forRoot({
      format: "json",
      modules: {
        syntax: true,
        toolbar: [
          ["bold", "italic", "underline", "strike"], // toggled buttons
          ["blockquote", "code-block"],

          [{header: 1}, {header: 2}], // custom button values
          [{list: "ordered"}, {list: "bullet"}],
          [{script: "sub"}, {script: "super"}], // superscript/subscript
          [{indent: "-1"}, {indent: "+1"}], // outdent/indent
          [{direction: "rtl"}], // text direction

          [{size: ["small", false, "large", "huge"]}], // custom dropdown
          [{header: [1, 2, 3, 4, 5, 6, false]}],

          [{color: []}, {background: []}], // dropdown with defaults from theme
          // [{font: []}],
          [{align: []}],

          ["clean"], // remove formatting button

          ["link", "image", "video"] // link and image, video
        ]
      }
    }),
    ReactiveFormsModule,
    RecaptchaV3Module,
    SpinnerModule,
    TableModule
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
