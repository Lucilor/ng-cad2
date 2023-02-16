import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {RouterTestingModule} from "@angular/router/testing";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {InfiniteScrollModule} from "ngx-infinite-scroll";
import {NgScrollbarModule} from "ngx-scrollbar";
import {ChangelogComponent} from "./changelog.component";

describe("ChangelogComponent", () => {
  let component: ChangelogComponent;
  let fixture: ComponentFixture<ChangelogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChangelogComponent],
      imports: [HttpModule, InfiniteScrollModule, MatDividerModule, MessageModule, NgScrollbarModule, RouterTestingModule, SpinnerModule],
      providers: [{provide: MatDialogRef, useValue: {}}]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChangelogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
