import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatCardModule} from "@angular/material/card";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {imgEmpty} from "@app/app.common";
import {CadData} from "@cad-viewer";
import {HttpModule} from "@modules/http/http.module";
import {ImageModule} from "@modules/image/image.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {DingdanbiaoqianComponent, Order} from "./dingdanbiaoqian.component";

const orders: Order[] = [
    {
        code: "1",
        cads: [
            {
                data: new CadData({info: {标签信息: [{key: 1, value: 1}]}}),
                isLarge: true,
                img: imgEmpty,
                imgLarge: imgEmpty,
                imgSize: [100, 100],
                calcW: 100,
                calcH: 100,
                style: {},
                imgStyle: {}
            }
        ],
        positions: [],
        style: {},
        info: [{}, {}, {}]
    }
];

describe("DingdanbiaoqianComponent", () => {
    let component: DingdanbiaoqianComponent;
    let fixture: ComponentFixture<DingdanbiaoqianComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DingdanbiaoqianComponent],
            imports: [
                FormsModule,
                HttpModule,
                ImageModule,
                MatCardModule,
                MatExpansionModule,
                MatSlideToggleModule,
                MessageModule,
                SpinnerModule
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(DingdanbiaoqianComponent);
        component = fixture.componentInstance;
        component.orders = orders;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});