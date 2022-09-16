import {ComponentFixture, TestBed} from "@angular/core/testing";
import {HttpModule} from "@modules/http/http.module";
import {InputModule} from "@modules/input/input.module";
import {MessageModule} from "@modules/message/message.module";
import {importObject} from "@utils";
import {NgScrollbarModule} from "ngx-scrollbar";
import {KailiaocanshuComponent, QiezhongkongItem} from "./kailiaocanshu.component";

describe("KailiaocanshuComponent", () => {
    let component: KailiaocanshuComponent;
    let fixture: ComponentFixture<KailiaocanshuComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [KailiaocanshuComponent],
            imports: [HttpModule, InputModule, MessageModule, NgScrollbarModule]
        }).compileComponents();

        fixture = TestBed.createComponent(KailiaocanshuComponent);
        component = fixture.componentInstance;
        const 参数: QiezhongkongItem[] = [importObject({}, component.defaultQiezhongkongItem)];
        component.updateData({_id: "1", 名字: "test", 分类: "切中空", 参数});
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
