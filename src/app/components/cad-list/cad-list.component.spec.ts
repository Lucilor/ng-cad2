import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CadListComponent } from './cad-list.component';

describe('CadListComponent', () => {
  let component: CadListComponent;
  let fixture: ComponentFixture<CadListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CadListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CadListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
