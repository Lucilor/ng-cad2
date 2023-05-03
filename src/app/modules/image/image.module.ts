import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {ImageComponent} from "./components/image/image.component";

@NgModule({
  declarations: [ImageComponent],
  imports: [BrowserAnimationsModule, CommonModule],
  exports: [ImageComponent]
})
export class ImageModule {}
