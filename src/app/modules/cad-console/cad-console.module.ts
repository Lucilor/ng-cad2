import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {CadConsoleComponent} from "./components/cad-console/cad-console.component";

@NgModule({
  declarations: [CadConsoleComponent],
  imports: [CommonModule, BrowserAnimationsModule],
  exports: [CadConsoleComponent]
})
export class CadConsoleModule {}
