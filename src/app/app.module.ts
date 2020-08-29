import {BrowserModule} from "@angular/platform-browser";
import {NgModule, Injectable} from "@angular/core";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {StoreModule} from "@ngrx/store";
import {reducers, metaReducers} from "./store/reducers";
import {HttpClientModule} from "@angular/common/http";

import {MatMenuModule} from "@angular/material/menu";
import {MatDialogModule} from "@angular/material/dialog";
import {MatButtonModule} from "@angular/material/button";
import {MatInputModule} from "@angular/material/input";
import {MatSnackBarModule, MAT_SNACK_BAR_DEFAULT_OPTIONS} from "@angular/material/snack-bar";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatIconModule} from "@angular/material/icon";
import {MatRadioModule} from "@angular/material/radio";
import {MatPaginatorModule, MatPaginatorIntl} from "@angular/material/paginator";
import {MatTableModule} from "@angular/material/table";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatTabsModule} from "@angular/material/tabs";
import {MatSelectModule} from "@angular/material/select";
import {MatCardModule} from "@angular/material/card";
import {MatListModule} from "@angular/material/list";

import {PerfectScrollbarModule, PerfectScrollbarConfigInterface, PERFECT_SCROLLBAR_CONFIG} from "ngx-perfect-scrollbar";
import {ColorPickerModule} from "@syncfusion/ej2-angular-inputs";
import {NgJsonEditorModule} from "ang-jsoneditor";

import {AppRoutingModule} from "./app-routing.module";
import {AppComponent} from "./app.component";
import {LoadingComponent} from "./components/loading/loading.component";
import {ImageComponent} from "./components/image/image.component";
import {PageNotFoundComponent} from "./components/page-not-found/page-not-found.component";
import {MessageComponent} from "./components/message/message.component";
import {IndexComponent} from "./components/index/index.component";
import {PrintCadComponent} from "./components/print-cad/print-cad.component";
import {MenuComponent} from "./components/menu/menu.component";
import {ToolbarComponent} from "./components/menu/toolbar/toolbar.component";
import {CadListComponent} from "./components/cad-list/cad-list.component";
import {SubCadsComponent} from "./components/menu/sub-cads/sub-cads.component";
import {CadLineComponent} from "./components/menu/cad-line/cad-line.component";
import {CadMtextComponent} from "./components/menu/cad-mtext/cad-mtext.component";
import {CadDimensionComponent} from "./components/menu/cad-dimension/cad-dimension.component";
import {CadDimensionFormComponent} from "./components/menu/cad-dimension-form/cad-dimension-form.component";
import {CadInfoComponent} from "./components/menu/cad-info/cad-info.component";
import {CadOptionsComponent} from "./components/menu/cad-options/cad-options.component";
import {ExpressionAnalysisComponent} from "./components/expression-analysis/expression-analysis.component";
import {OrderListComponent} from "./components/order-list/order-list.component";
import {CadPointsComponent} from "./components/menu/cad-points/cad-points.component";
import {CadAssembleComponent} from "./components/menu/cad-assemble/cad-assemble.component";
import {TestComponent} from "./components/test/test.component";
import {JsonEditorComponent} from "./components/json-editor/json-editor.component";
import {CadSearchFormComponent} from "./components/cad-search-form/cad-search-form.component";
import {PrintA4A015PreviewComponent} from "./components/print-a4-a015-preview/print-a4-a015-preview.component";
import {CadConsoleComponent} from "./components/cad-console/cad-console.component";

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
		// tslint:disable-next-line: semicolon
	};
}

const DEFAULT_PERFECT_SCROLLBAR_CONFIG: PerfectScrollbarConfigInterface = {
	wheelPropagation: true
};

@NgModule({
	declarations: [
		AppComponent,
		LoadingComponent,
		ImageComponent,
		PageNotFoundComponent,
		MessageComponent,
		IndexComponent,
		PrintCadComponent,
		MenuComponent,
		ToolbarComponent,
		CadListComponent,
		SubCadsComponent,
		CadLineComponent,
		CadMtextComponent,
		CadDimensionComponent,
		CadDimensionFormComponent,
		CadInfoComponent,
		CadOptionsComponent,
		ExpressionAnalysisComponent,
		OrderListComponent,
		CadPointsComponent,
		CadAssembleComponent,
		TestComponent,
		JsonEditorComponent,
		CadSearchFormComponent,
		PrintA4A015PreviewComponent,
		CadConsoleComponent
	],
	imports: [
		BrowserModule,
		StoreModule.forRoot(reducers, {
			metaReducers,
			runtimeChecks: {
				strictStateImmutability: true,
				strictActionImmutability: true
			}
		}),
		AppRoutingModule,
		HttpClientModule,
		BrowserAnimationsModule,
		FormsModule,
		ReactiveFormsModule,
		MatMenuModule,
		MatDialogModule,
		MatButtonModule,
		MatInputModule,
		MatSnackBarModule,
		MatSlideToggleModule,
		MatExpansionModule,
		MatCheckboxModule,
		MatIconModule,
		MatRadioModule,
		MatPaginatorModule,
		MatTableModule,
		MatAutocompleteModule,
		MatTabsModule,
		MatSelectModule,
		MatCardModule,
		MatListModule,
		PerfectScrollbarModule,
		ColorPickerModule,
		NgJsonEditorModule
	],
	providers: [
		{provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 3000, verticalPosition: "top"}},
		{provide: MatPaginatorIntl, useClass: MyMatPaginatorIntl},
		{provide: PERFECT_SCROLLBAR_CONFIG, useValue: DEFAULT_PERFECT_SCROLLBAR_CONFIG}
	],
	bootstrap: [AppComponent]
})
export class AppModule {}
