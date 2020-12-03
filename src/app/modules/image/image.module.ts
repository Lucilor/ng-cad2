import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ImageComponent} from "./components/image/image.component";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";

@NgModule({
    declarations: [ImageComponent],
    imports: [BrowserAnimationsModule, CommonModule],
    exports: [ImageComponent]
})
export class ImageModule {}
