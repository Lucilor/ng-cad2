import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {NgxUiLoaderHttpModule} from "ngx-ui-loader";
import {HttpClientModule} from "@angular/common/http";
import {MessageModule} from "../message/message.module";
import {RouterModule} from "@angular/router";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";

@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        HttpClientModule,
        MatSnackBarModule,
        BrowserAnimationsModule,
        RouterModule.forRoot([]),
        MessageModule,
        NgxUiLoaderHttpModule
    ]
})
export class HttpModule {}
