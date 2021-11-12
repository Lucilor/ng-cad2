import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {NgScrollbarModule} from "ngx-scrollbar";
import {BbzhmkgzComponent, BbzhmkgzComponentData} from "./bbzhmkgz.component";

const data: BbzhmkgzComponentData = {value: "test", vars: {a: "1", b: "2"}};
describe("BbzhmkgzComponent", () => {
    let component: BbzhmkgzComponent;
    let fixture: ComponentFixture<BbzhmkgzComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [BbzhmkgzComponent],
            imports: [BrowserAnimationsModule, FormsModule, MatFormFieldModule, MatInputModule, NgScrollbarModule],
            providers: [
                {provide: MatDialogRef, useValue: {}},
                {provide: MAT_DIALOG_DATA, useValue: data}
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(BbzhmkgzComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
