import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatIconModule} from "@angular/material/icon";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {HttpModule} from "@modules/http/http.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {PrintCadComponent} from "./print-cad.component";

describe("PrintCADComponent", () => {
    let component: PrintCadComponent;
    let fixture: ComponentFixture<PrintCadComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [PrintCadComponent],
            imports: [HttpModule, MatIconModule, MatSlideToggleModule, SpinnerModule]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(PrintCadComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
