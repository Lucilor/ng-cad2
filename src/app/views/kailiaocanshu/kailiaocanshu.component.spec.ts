import {ComponentFixture, TestBed} from "@angular/core/testing";
import {defaultQiezhongkongItem, KlcsComponent, QiezhongkongItem} from "@components/klcs/klcs.component";
import {HttpModule} from "@modules/http/http.module";
import {InputModule} from "@modules/input/input.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {importObject} from "@utils";
import {NgScrollbarModule} from "ngx-scrollbar";
import {KailiaocanshuComponent} from "./kailiaocanshu.component";

describe("KailiaocanshuComponent", () => {
    let component: KailiaocanshuComponent;
    let fixture: ComponentFixture<KailiaocanshuComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [KailiaocanshuComponent, KlcsComponent],
            imports: [HttpModule, InputModule, MessageModule, NgScrollbarModule, SpinnerModule]
        }).compileComponents();

        fixture = TestBed.createComponent(KailiaocanshuComponent);
        component = fixture.componentInstance;
        const 参数: QiezhongkongItem[] = [importObject({}, defaultQiezhongkongItem)];
        component.data = {_id: "1", 名字: "test", 分类: "切中空", 参数};
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
