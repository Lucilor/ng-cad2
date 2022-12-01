import {DragDropModule} from "@angular/cdk/drag-drop";
import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatPaginatorModule} from "@angular/material/paginator";
import {MatSelectModule} from "@angular/material/select";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {ChangelogAdminComponent} from "./changelog-admin.component";

describe("ChangelogAdminComponent", () => {
  let component: ChangelogAdminComponent;
  let fixture: ComponentFixture<ChangelogAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChangelogAdminComponent],
      imports: [
        DragDropModule,
        HttpModule,
        FormsModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatFormFieldModule,
        MatExpansionModule,
        MatPaginatorModule,
        MatSelectModule,
        MessageModule,
        NgScrollbarModule,
        SpinnerModule
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChangelogAdminComponent);
    component = fixture.componentInstance;
    component.changelog = [{timeStamp: new Date().getTime(), content: [{type: "feat", items: ["1", "2"]}]}];
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
