import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatDialogModule} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {HttpModule} from "@src/app/modules/http/http.module";
import {MessageModule} from "@src/app/modules/message/message.module";
import {CadPointsComponent} from "../../cad-points/cad-points.component";

import {CadInfoComponent} from "./cad-info.component";

describe("CadInfoComponent", () => {
    let component: CadInfoComponent;
    let fixture: ComponentFixture<CadInfoComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadInfoComponent, CadPointsComponent],
            imports: [FormsModule, MatDialogModule, MatIconModule, MatInputModule, MatSelectModule, HttpModule, MessageModule]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CadInfoComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
