import {ComponentFixture, TestBed} from "@angular/core/testing";
import {CadAssembleFormComponent} from "./cad-assemble-form.component";

describe("CadAssembleFormComponent", () => {
    let component: CadAssembleFormComponent;
    let fixture: ComponentFixture<CadAssembleFormComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadAssembleFormComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(CadAssembleFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
