import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {CadData} from "@cad-viewer";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {ZixuanpeijianComponent, ZixuanpeijianData} from "./zixuanpeijian.component";

const sourceData: CadData[] = [];
for (let i = 0; i < 3; i++) {
    sourceData.push(new CadData());
}
const data: ZixuanpeijianData = {code: "1", type: "order", sourceData, selectedData: [sourceData[0]]};

describe("ZixuanpeijianComponent", () => {
    let component: ZixuanpeijianComponent;
    let fixture: ComponentFixture<ZixuanpeijianComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ZixuanpeijianComponent],
            imports: [
                FormsModule,
                HttpModule,
                MatDividerModule,
                MatFormFieldModule,
                MatInputModule,
                MatSelectModule,
                MessageModule,
                NgScrollbarModule
            ],
            providers: [
                {provide: MatDialogRef, useValue: {}},
                {provide: MAT_DIALOG_DATA, useValue: data}
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ZixuanpeijianComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
