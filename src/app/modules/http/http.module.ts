import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {NgxUiLoaderHttpModule} from "ngx-ui-loader";
import {HttpClientModule} from "@angular/common/http";
import {RouterModule} from "@angular/router";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {MessageModule} from "@modules/message/message.module";

@NgModule({
  declarations: [],
  imports: [CommonModule, HttpClientModule, BrowserAnimationsModule, RouterModule.forRoot([]), MessageModule, NgxUiLoaderHttpModule]
})
export class HttpModule {}
