import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {HttpModule} from "@modules/http/http.module";
import {InputModule} from "@modules/input/input.module";
import {MessageModule} from "@modules/message/message.module";
import {CadAssembleFormComponent, CadAssembleFormInput} from "./cad-assemble-form.component";

const data: CadAssembleFormInput = {x: 1, y: 2};

describe("CadAssembleFormComponent", () => {
    let component: CadAssembleFormComponent;
    let fixture: ComponentFixture<CadAssembleFormComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadAssembleFormComponent],
            imports: [HttpModule, InputModule, MessageModule],
            providers: [
                {provide: MatDialogRef, useValue: {}},
                {provide: MAT_DIALOG_DATA, useValue: data}
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CadAssembleFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
