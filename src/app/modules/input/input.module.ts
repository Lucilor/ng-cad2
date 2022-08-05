import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {InputComponent} from "./components/input.component";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {FormsModule} from "@angular/forms";
import {MatIconModule} from "@angular/material/icon";

@NgModule({
    declarations: [InputComponent],
    imports: [CommonModule, FormsModule, MatAutocompleteModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
    exports: [InputComponent]
})
export class InputModule {}
