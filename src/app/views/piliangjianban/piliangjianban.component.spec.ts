import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatCardModule} from "@angular/material/card";
import {MatExpansionModule} from "@angular/material/expansion";
import {imgEmpty} from "@app/app.common";
import {CadData} from "@cad-viewer";
import {HttpModule} from "@modules/http/http.module";
import {ImageModule} from "@modules/image/image.module";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {Bancai, PiliangjianbanComponent} from "./piliangjianban.component";

const bancais: Bancai[] = [
    {
        data: [
            {
                cad: new CadData(),
                code: "1",
                num: 100,
                zhankaiSize: [100, 100],
                unfolded: new CadData(),
                img: imgEmpty,
                imgLarge: imgEmpty
            }
        ],
        id: "123",
        厚度: "",
        数量: 20,
        材料: "",
        板材: "",
        气体: "",
        规格: [20, 10],
        expanded: true,
        pageNum: 1,
        pageBreakAfter: "always",
        printPageIndex: 0
    }
];

describe("PiliangjianbanComponent", () => {
    let component: PiliangjianbanComponent;
    let fixture: ComponentFixture<PiliangjianbanComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [PiliangjianbanComponent],
            imports: [HttpModule, ImageModule, MatCardModule, MatExpansionModule, MessageModule, NgScrollbarModule]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(PiliangjianbanComponent);
        component = fixture.componentInstance;
        component.getBancais(bancais);
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
