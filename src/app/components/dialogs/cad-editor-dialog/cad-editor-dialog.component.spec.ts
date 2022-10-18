import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadData} from "@cad-viewer";
import {CadEditorModule} from "@modules/cad-editor/cad-editor.module";
import {HttpModule} from "@modules/http/http.module";
import {CadEditorDialogComponent, CadEditorInput} from "./cad-editor-dialog.component";

const data: CadEditorInput = {data: new CadData({name: "test"}), collection: "cad"};

describe("CadEditorDialogComponent", () => {
    let component: CadEditorDialogComponent;
    let fixture: ComponentFixture<CadEditorDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadEditorDialogComponent],
            imports: [CadEditorModule, HttpModule],
            providers: [
                {provide: MatDialogRef, useValue: {}},
                {provide: MAT_DIALOG_DATA, useValue: data}
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CadEditorDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
